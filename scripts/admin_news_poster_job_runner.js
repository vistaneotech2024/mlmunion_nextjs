const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');

const runId = process.env.NEWS_POST_RUN_ID || process.argv[2] || crypto.randomUUID();
const cancelFlagFile =
  process.env.NEWS_POST_CANCEL_FILE || path.join(__dirname, 'logs', `cancel-${runId}.flag`);

const scriptsLogDir = path.join(__dirname, 'logs');
fs.mkdirSync(scriptsLogDir, { recursive: true });

const statusFile = path.join(scriptsLogDir, `run-${runId}.status.json`);
const wrapperLogFile = path.join(scriptsLogDir, `run-${runId}.wrapper.log`);

const posterScriptPath = path.join(__dirname, 'news_poster_v2.js');
if (!fs.existsSync(posterScriptPath)) {
  fs.writeFileSync(
    statusFile,
    JSON.stringify(
      { runId, state: 'failed', startedAt: new Date().toISOString(), exitCode: null, error: 'Poster script missing' },
      null,
      2,
    ),
  );
  process.exit(1);
}

const status = {
  runId,
  state: 'starting',
  startedAt: new Date().toISOString(),
  totalCompanies: (() => {
    const n = parseInt(process.env.NEWS_POST_TOPIC_COUNT || '0', 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  })(),
  savedCount: 0,
  failedCount: 0,
  progress: (() => {
    const n = parseInt(process.env.NEWS_POST_TOPIC_COUNT || '0', 10);
    const total = Number.isFinite(n) && n > 0 ? n : 1;
    return { index: 0, total };
  })(),
  lastCompany: null,
  lastTasks: null,
  lastMessage: null,
  exitCode: null,
  finishedAt: null,
};

let statusDirty = true;
let lastStatusWriteAt = 0;

function markDirty() {
  statusDirty = true;
}

function writeStatus() {
  fs.writeFileSync(statusFile, JSON.stringify(status, null, 2), 'utf8');
  statusDirty = false;
  lastStatusWriteAt = Date.now();
}

function appendWrapperLog(line) {
  fs.appendFileSync(wrapperLogFile, line + '\n', 'utf8');
}

function updateFromLine(trimmed) {
  const cleaned = String(trimmed || '').replace(/\uFFFD/g, '');
  status.lastMessage = cleaned;
  appendWrapperLog(cleaned);

  // Example: "INFO [1/1] Processing topic: Pune court declares..."
  const topicProcessing = trimmed.match(/\[(\d+)\/(\d+)\]\s*Processing topic:\s*(.*)$/);
  if (topicProcessing) {
    const idx = Number(topicProcessing[1]);
    const total = Number(topicProcessing[2]);
    const headline = String(topicProcessing[3] || '').trim();
    status.progress = { index: idx, total: Number.isFinite(total) ? total : null };
    status.lastCompany = headline || null;
    if (status.state === 'starting') status.state = 'running';
    markDirty();
    return;
  }

  if (trimmed.includes('Published! ID:')) {
    status.savedCount += 1;
    if (status.state === 'starting') status.state = 'running';
    markDirty();
    return;
  }

  if (trimmed.includes('FAILED:')) {
    status.failedCount += 1;
    if (status.state === 'starting') status.state = 'running';
    markDirty();
    return;
  }

  const savedSummary = trimmed.match(/INFO Saved:\s*(\d+)/);
  if (savedSummary) {
    status.savedCount = Number(savedSummary[1]) || status.savedCount;
    markDirty();
    return;
  }

  const failedSummary = trimmed.match(/INFO Failed:\s*(\d+)/);
  if (failedSummary) {
    status.failedCount = Number(failedSummary[1]) || status.failedCount;
    markDirty();
    return;
  }
}

function attachStream(stream) {
  let buffer = '';
  stream.on('data', (chunk) => {
    const text = String(chunk);
    buffer += text;
    const parts = buffer.split(/\r?\n/);
    buffer = parts.pop() || '';
    for (const line of parts) {
      const trimmed = line.trim();
      if (trimmed) updateFromLine(trimmed);
    }
  });
}

let child = null;
let cancelledRequested = false;
let cancelKillTimeout = null;

function cancelRequestedByFlag() {
  try {
    return fs.existsSync(cancelFlagFile);
  } catch {
    return false;
  }
}

const statusWriteInterval = setInterval(() => {
  if (!statusDirty) return;
  const now = Date.now();
  if (now - lastStatusWriteAt > 800) writeStatus();
}, 900);

const cancelPollInterval = setInterval(() => {
  if (cancelledRequested) return;
  if (!child) return;
  if (cancelRequestedByFlag()) {
    cancelledRequested = true;
    status.state = 'cancelled';
    status.lastMessage = 'Cancellation requested (flag detected). Stopping job…';
    markDirty();
    try {
      child.kill('SIGTERM');
    } catch {
      // ignore
    }
    cancelKillTimeout = setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch {
        // ignore
      }
    }, 10000);
  }
}, 1000);

writeStatus();

child = spawn(process.execPath, [posterScriptPath], {
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe'],
});

child.stdout.setEncoding('utf8');
child.stderr.setEncoding('utf8');
attachStream(child.stdout);
attachStream(child.stderr);

child.on('error', (err) => {
  status.state = 'failed';
  status.lastMessage = err?.message || 'Failed to start poster';
  status.finishedAt = new Date().toISOString();
  markDirty();
  writeStatus();
  clearInterval(statusWriteInterval);
  clearInterval(cancelPollInterval);
  process.exit(1);
});

child.on('close', (code) => {
  if (cancelKillTimeout) clearTimeout(cancelKillTimeout);
  clearInterval(statusWriteInterval);
  clearInterval(cancelPollInterval);

  status.exitCode = typeof code === 'number' ? code : null;
  status.finishedAt = new Date().toISOString();
  status.state = cancelledRequested ? 'cancelled' : code === 0 ? 'completed' : 'failed';

  markDirty();
  writeStatus();
});

