import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ScheduleEntry = {
  scheduleId: string;
  scheduledFor: string;
  createdAt: string;
  topics: string[];
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

export async function POST(req: Request) {
  const { isAdmin } = await ensureAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { scheduleId?: string };
  const scheduleId = String(body.scheduleId || '').trim();
  if (!scheduleId) return NextResponse.json({ error: 'Missing scheduleId' }, { status: 400 });

  const logsDir = path.join(process.cwd(), 'scripts', 'logs');
  fs.mkdirSync(logsDir, { recursive: true });
  const cancelFlagFile = path.join(logsDir, `cancel-schedule-${scheduleId}.flag`);
  fs.writeFileSync(cancelFlagFile, String(Date.now()), 'utf8');

  const entries = readStore();
  const next = entries.map((e) => {
    if (e.scheduleId !== scheduleId) return e;
    if (e.status === 'completed' || e.status === 'failed') return e;
    return { ...e, status: 'cancelled' as const };
  });
  writeStore(next);

  return NextResponse.json({ ok: true, scheduleId, cancelRequested: true });
}

