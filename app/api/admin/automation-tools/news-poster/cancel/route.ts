import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import path from 'path';
import fs from 'fs';

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

    const body = (await req.json().catch(() => ({}))) as { runId?: string };
    const runId = body.runId;
    if (!runId) return NextResponse.json({ error: 'Missing runId' }, { status: 400 });

    const logsDir = path.join(process.cwd(), 'scripts', 'logs');
    fs.mkdirSync(logsDir, { recursive: true });

    const cancelFlagFile = path.join(logsDir, `cancel-${runId}.flag`);
    fs.writeFileSync(cancelFlagFile, String(Date.now()), 'utf8');

    return NextResponse.json({ ok: true, runId, cancelRequested: true });
  } catch (err) {
    console.error('News poster cancel fatal error:', err);
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

