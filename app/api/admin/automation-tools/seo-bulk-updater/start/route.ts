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

    const body = (await req.json().catch(() => ({}))) as {
      tasks?: {
        description?: boolean;
        website?: boolean;
        focus_keyword?: boolean;
        meta_description?: boolean;
      };
      batchLimit?: number;
      delayMs?: number;
    };

    const runId = crypto.randomUUID();
    const logsDir = path.join(process.cwd(), 'scripts', 'logs');
    fs.mkdirSync(logsDir, { recursive: true });

    const cancelFlagFile = path.join(logsDir, `cancel-${runId}.flag`);
    if (fs.existsSync(cancelFlagFile)) fs.unlinkSync(cancelFlagFile);

    const batchLimit = Number.isFinite(body.batchLimit) ? Number(body.batchLimit) : 500;
    const delayMs = Number.isFinite(body.delayMs) ? Number(body.delayMs) : 3000;

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Missing Supabase env vars. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 500 },
      );
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY in env.' }, { status: 500 });
    }

    const tasks = body.tasks || {};

    const wrapperPath = path.join(process.cwd(), 'scripts', 'admin_seo_bulk_updater_job_runner.js');
    if (!fs.existsSync(wrapperPath)) {
      return NextResponse.json({ error: 'Job runner not found: ' + wrapperPath }, { status: 500 });
    }

    const childEnv = {
      ...process.env,
      SEO_UPDATER_RUN_ID: runId,
      SEO_UPDATER_CANCEL_FILE: cancelFlagFile,

      // Updater expects these env names:
      SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      OPENAI_KEY: process.env.OPENAI_API_KEY,

      BATCH_LIMIT: String(Math.max(1, Math.min(5000, batchLimit))),
      DELAY_MS: String(Math.max(0, Math.min(300000, delayMs))),

      TASK_DESCRIPTION: String(tasks.description ?? true),
      TASK_WEBSITE: String(tasks.website ?? true),
      TASK_FOCUS_KEYWORD: String(tasks.focus_keyword ?? true),
      TASK_META_DESCRIPTION: String(tasks.meta_description ?? true),
    };

    const child = spawn(process.execPath, [wrapperPath], {
      env: childEnv,
      detached: true,
      stdio: 'ignore',
    });
    child.unref();

    return NextResponse.json({
      runId,
      started: true,
    });
  } catch (err) {
    console.error('SEO bulk updater start fatal error:', err);
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

