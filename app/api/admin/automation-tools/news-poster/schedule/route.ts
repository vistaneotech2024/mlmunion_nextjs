import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ScheduleEntry = {
  scheduleId: string;
  scheduledFor: string; // ISO string
  createdAt: string; // ISO string
  topics: string[]; // up to 1 topic
  language: string;
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled';
  posterRunId?: string;
};

function schedulesStorePath() {
  return path.join(process.cwd(), 'scripts', 'news_schedule_store.json');
}

function readStore(): ScheduleEntry[] {
  try {
    const p = schedulesStorePath();
    if (!fs.existsSync(p)) return [];
    const raw = fs.readFileSync(p, 'utf8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data as ScheduleEntry[];
  } catch {
    return [];
  }
}

function writeStore(entries: ScheduleEntry[]) {
  const p = schedulesStorePath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(entries, null, 2), 'utf8');
}

async function ensureAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { isAdmin: false, user: null };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Error loading admin profile:', profileError);
    return { isAdmin: false, user };
  }

  return { isAdmin: Boolean(profile?.is_admin), user };
}

export async function GET() {
  const { isAdmin } = await ensureAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const entries = readStore()
    .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
    .slice(-200);

  return NextResponse.json({ entries });
}

export async function POST(req: Request) {
  const { isAdmin, user } = await ensureAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    topics?: string[];
    language?: string;
    scheduledAt?: string; // ISO string
  };

  const topics = Array.isArray(body.topics)
    ? body.topics.map((t) => String(t || '').trim()).filter(Boolean).slice(0, 1)
    : [];
  const language = String(body.language || 'English').trim() || 'English';

  const scheduledAt = String(body.scheduledAt || '').trim();
  if (!scheduledAt) return NextResponse.json({ error: 'Missing scheduledAt' }, { status: 400 });
  const scheduledDate = new Date(scheduledAt);
  if (Number.isNaN(scheduledDate.getTime())) {
    return NextResponse.json({ error: 'Invalid scheduledAt' }, { status: 400 });
  }
  if (scheduledDate.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'scheduledAt must be in the future' }, { status: 400 });
  }

  const scheduleId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const entry: ScheduleEntry = {
    scheduleId,
    scheduledFor: scheduledDate.toISOString(),
    createdAt,
    topics,
    language,
    status: 'scheduled',
  };

  const entries = readStore();
  entries.push(entry);
  writeStore(entries);

  const logsDir = path.join(process.cwd(), 'scripts', 'logs');
  fs.mkdirSync(logsDir, { recursive: true });
  const cancelFlagFile = path.join(logsDir, `cancel-schedule-${scheduleId}.flag`);
  if (fs.existsSync(cancelFlagFile)) fs.unlinkSync(cancelFlagFile);

  const wrapperPath = path.join(process.cwd(), 'scripts', 'admin_news_poster_schedule_runner.js');
  if (!fs.existsSync(wrapperPath)) {
    return NextResponse.json({ error: 'Schedule runner not found: ' + wrapperPath }, { status: 500 });
  }

  const childEnv = {
    ...process.env,
    NEWS_SCHEDULE_ID: scheduleId,
    NEWS_SCHEDULED_AT: scheduledDate.toISOString(),
    NEWS_SCHEDULE_TOPICS: topics.length ? JSON.stringify(topics) : '',
    NEWS_SCHEDULE_LANGUAGE: language,
    NEWS_AUTHOR_ID: user.id,
    NEWS_SCHEDULE_CANCEL_FILE: cancelFlagFile,

    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    MODEL: process.env.MODEL || 'gpt-4o',
  };

  const child = spawn(process.execPath, [wrapperPath], {
    env: childEnv,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();

  return NextResponse.json({ scheduleId, started: true });
}

