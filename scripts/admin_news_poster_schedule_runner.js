const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function schedulesStorePath() {
  return path.join(process.cwd(), 'scripts', 'news_schedule_store.json');
}

function readStore() {
  try {
    const p = schedulesStorePath();
    if (!fs.existsSync(p)) return [];
    const raw = fs.readFileSync(p, 'utf8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data;
  } catch {
    return [];
  }
}

function writeStore(entries) {
  const p = schedulesStorePath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(entries, null, 2), 'utf8');
}

const scheduleId = process.env.NEWS_SCHEDULE_ID || process.argv[2];
const scheduledAtISO = process.env.NEWS_SCHEDULED_AT || '';
const cancelFlagFile =
  process.env.NEWS_SCHEDULE_CANCEL_FILE ||
  path.join(process.cwd(), 'scripts', 'logs', `cancel-schedule-${scheduleId || 'unknown'}.flag`);

const topicsRaw = process.env.NEWS_SCHEDULE_TOPICS || '';
let topics = [];
try {
  if (topicsRaw && topicsRaw.trim().startsWith('[')) {
    const arr = JSON.parse(topicsRaw);
    if (Array.isArray(arr)) topics = arr.map((t) => String(t || '').trim()).filter(Boolean).slice(0, 1);
  }
} catch {
  topics = [];
}

const language = process.env.NEWS_SCHEDULE_LANGUAGE || 'English';
const authorId = process.env.NEWS_AUTHOR_ID || null;

const posterRunId = process.env.NEWS_POST_RUN_ID || `news-poster-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const posterCancelFile = cancelFlagFile;

const logsDir = path.join(process.cwd(), 'scripts', 'logs');
fs.mkdirSync(logsDir, { recursive: true });
const scheduleLogFile = path.join(logsDir, `schedule-${scheduleId}.wrapper.log`);

function isCancelRequested() {
  try {
    return scheduleId && fs.existsSync(cancelFlagFile);
  } catch {
    return false;
  }
}

function log(line) {
  const txt = String(line || '');
  fs.appendFileSync(scheduleLogFile, txt + '\n', 'utf8');
}

function setStatus(status) {
  const entries = readStore();
  const next = entries.map((e) => {
    if (e.scheduleId !== scheduleId) return e;
    if (status === 'running') return { ...e, status, posterRunId: posterRunId };
    return { ...e, status };
  });
  writeStore(next);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (!scheduleId) {
    throw new Error('Missing NEWS_SCHEDULE_ID');
  }
  if (!scheduledAtISO) {
    throw new Error('Missing NEWS_SCHEDULED_AT');
  }

  const scheduledAt = new Date(scheduledAtISO).getTime();
  if (Number.isNaN(scheduledAt)) throw new Error('Invalid NEWS_SCHEDULED_AT');

  log(`SCHEDULE ${scheduleId} waiting until ${new Date(scheduledAt).toISOString()}`);

  // Wait with periodic checks for cancellation.
  while (Date.now() < scheduledAt) {
    if (isCancelRequested()) {
      log(`SCHEDULE ${scheduleId} cancelled before start`);
      setStatus('cancelled');
      return;
    }
    const remaining = scheduledAt - Date.now();
    await sleep(Math.min(5000, Math.max(500, remaining)));
  }

  if (isCancelRequested()) {
    log(`SCHEDULE ${scheduleId} cancelled before launch`);
    setStatus('cancelled');
    return;
  }

  setStatus('running');

  const jobRunnerPath = path.join(process.cwd(), 'scripts', 'admin_news_poster_job_runner.js');
  if (!fs.existsSync(jobRunnerPath)) {
    log(`Schedule runner missing job runner: ${jobRunnerPath}`);
    setStatus('failed');
    return;
  }

  const childEnv = {
    ...process.env,
    NEWS_POST_RUN_ID: posterRunId,
    NEWS_POST_CANCEL_FILE: posterCancelFile,
    NEWS_AUTHOR_ID: authorId || '',
    NEWS_POST_LANGUAGE: language,
    NEWS_POST_TOPIC_COUNT: '1',
    NEWS_POST_TOPICS: topics.length ? JSON.stringify([topics[0]]) : '',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    MODEL: process.env.MODEL || 'gpt-4o',
  };

  log(`SCHEDULE ${scheduleId} launching poster job: ${posterRunId}`);

  await new Promise((resolve) => {
    const child = spawn(process.execPath, [jobRunnerPath], {
      env: childEnv,
      stdio: 'ignore',
    });
    child.on('close', (code) => {
      log(`SCHEDULE ${scheduleId} poster job closed with code ${code}`);
      // If cancel flag exists, treat it as cancelled.
      if (isCancelRequested()) setStatus('cancelled');
      else setStatus(code === 0 ? 'completed' : 'failed');
      resolve();
    });
    child.on('error', () => {
      log(`SCHEDULE ${scheduleId} poster job spawn error`);
      setStatus('failed');
      resolve();
    });
  });
}

main().catch((e) => {
  try {
    log(`Schedule runner fatal: ${e?.message || String(e)}`);
    if (scheduleId) setStatus('failed');
  } catch {
    // ignore
  }
  process.exit(1);
});

