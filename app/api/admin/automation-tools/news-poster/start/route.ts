import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  try {
    const { isAdmin } = await ensureAdmin();
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // ensureAdmin() only returns isAdmin; we need actual admin user id to set author_id
    const { user } = await ensureAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as {
      topics?: string[];
      language?: string;
    };

    const topics = Array.isArray(body?.topics)
      ? body.topics.map((t) => String(t || '').trim()).filter(Boolean)
      : [];
    const topicCount = topics.length > 0 ? Math.min(1, topics.length) : 0;
    const language = String(body?.language || 'English').trim() || 'English';

    const runId = crypto.randomUUID();
    const logsDir = path.join(process.cwd(), 'scripts', 'logs');
    fs.mkdirSync(logsDir, { recursive: true });

    const cancelFlagFile = path.join(logsDir, `cancel-${runId}.flag`);
    if (fs.existsSync(cancelFlagFile)) fs.unlinkSync(cancelFlagFile);

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: 'Missing NEXT_PUBLIC_SUPABASE_URL' }, { status: 500 });
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 });
    }

    const wrapperPath = path.join(process.cwd(), 'scripts', 'admin_news_poster_job_runner.js');
    if (!fs.existsSync(wrapperPath)) {
      return NextResponse.json({ error: 'Job runner not found: ' + wrapperPath }, { status: 500 });
    }

    const childEnv = {
      ...process.env,
      NEWS_POST_RUN_ID: runId,
      NEWS_POST_CANCEL_FILE: cancelFlagFile,
      NEWS_AUTHOR_ID: user.id,
      // Always run exactly 1 post per job.
      NEWS_POST_TOPIC_COUNT: String(topicCount || 1),
      NEWS_POST_TOPICS: topicCount > 0 ? JSON.stringify(topics.slice(0, 1)) : '',
      NEWS_POST_LANGUAGE: language,

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

    return NextResponse.json({ runId, started: true });
  } catch (err) {
    console.error('News poster start fatal error:', err);
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

