import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const runId = searchParams.get('runId');
  if (!runId) return NextResponse.json({ error: 'Missing runId' }, { status: 400 });

  const logsDir = path.join(process.cwd(), 'scripts', 'logs');
  const statusFile = path.join(logsDir, `run-${runId}.status.json`);
  const wrapperLogFile = path.join(logsDir, `run-${runId}.wrapper.log`);

  if (!fs.existsSync(statusFile)) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }

  const rawStatus = fs.readFileSync(statusFile, 'utf8');
  const status = JSON.parse(rawStatus);

  let logTail = '';
  try {
    if (fs.existsSync(wrapperLogFile)) {
      const data = fs.readFileSync(wrapperLogFile, 'utf8');
      logTail = data.slice(Math.max(0, data.length - 50000));
    }
  } catch {
    // ignore log tail errors
  }

  return NextResponse.json({
    ...status,
    logTail,
  });
}

