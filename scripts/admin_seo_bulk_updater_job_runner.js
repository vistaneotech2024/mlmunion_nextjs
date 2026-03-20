const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');

const runId =
  process.env.SEO_UPDATER_RUN_ID ||
  process.argv[2] ||
  crypto.randomUUID();

const cancelFlagFile =
  process.env.SEO_UPDATER_CANCEL_FILE ||
  path.join(__dirname, 'logs', `cancel-${runId}.flag`);

const scriptsLogDir = path.join(__dirname, 'logs');
fs.mkdirSync(scriptsLogDir, { recursive: true });

const statusFile = path.join(scriptsLogDir, `run-${runId}.status.json`);
const wrapperLogFile = path.join(scriptsLogDir, `run-${runId}.wrapper.log`);

const updaterScriptPath = path.join(__dirname, 'mlm_seo_updater_v3.js');
if (!fs.existsSync(updaterScriptPath)) {
  fs.writeFileSync(statusFile, JSON.stringify({ runId, state: 'failed', error: 'Updater script missing', startedAt: new Date().toISOString() }, null, 2));
  process.exit(1);
}

let status = {
  runId,
  state: 'starting',
  startedAt: new Date().toISOString(),
  totalCompanies: null,
  savedCount: 0,
  failedCount: 0,
  progress: { index: 0, total: null },
  lastCompany: null,
  lastTasks: [],
  lastMessage: null,
  exitCode: null,
  finishedAt: null,
  lastLogLine: null,
};

let statusDirty = true;
let lastStatusWriteAt = 0;

function writeStatus() {
  fs.writeFileSync(statusFile, JSON.stringify(status, null, 2), 'utf8');
  statusDirty = false;
  lastStatusWriteAt = Date.now();
}

function markDirty() {
  statusDirty = true;
}

function appendWrapperLog(line) {
  fs.appendFileSync(wrapperLogFile, line + '\n', 'utf8');
}

function updateFromLine(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed) return;

  status.lastLogLine = trimmed;
  appendWrapperLog(trimmed);

  // Total companies (used for UI context).
  // Example: "→ Found 500 companies — ALL will be approved"
  const totalMatch = trimmed.match(/Found\s+(\d+)\s+companies/i);
  if (totalMatch) {
    status.totalCompanies = Number(totalMatch[1]) || null;
    if (status.state === 'starting') status.state = 'running';
  }

  // Progress line:
  // "→ [3/500] Company Name  tasks=[description, website]"
  const progressMatch = trimmed.match(/\]\s*→\s*\[(\d+)\s*\/\s*(\d+)\]\s*(.*?)\s+tasks=\[(.*?)\]/);
  if (progressMatch) {
    const idx = Number(progressMatch[1]);
    const total = Number(progressMatch[2]);
    const companyName = String(progressMatch[3] || '').trim();
    const tasksStr = String(progressMatch[4] || '').trim();
    const taskList = tasksStr ? tasksStr.split(',').map((s) => s.trim()).filter(Boolean) : [];

    status.progress = {
      index: Number.isFinite(idx) ? idx : 0,
      total: Number.isFinite(total) ? total : null,
    };
    status.lastCompany = companyName || null;
    status.lastTasks = taskList;

    if (status.state === 'starting') status.state = 'running';
    status.lastMessage = `Processing: ${companyName}${taskList.length ? ` (${taskList.join(', ')})` : ''}`;
    markDirty();
  }

  // Success line (the script uses a checkmark + "Saved →")
  if (trimmed.includes('Saved') && trimmed.includes('→')) {
    // "Saved → desc(...) | site=... | ..."
    if (trimmed.includes('Saved →')) {
      status.savedCount += 1;
      status.lastMessage = trimmed;
      if (status.state === 'starting') status.state = 'running';
      markDirty();
    }
  }

  // Failure line: "FAILED: ..."
  if (trimmed.includes('FAILED:')) {
    status.failedCount += 1;
    status.lastMessage = trimmed;
    if (status.state === 'starting') status.state = 'running';
    markDirty();
  }

  // Terminal summary lines
  const approvedMatch = trimmed.match(/Approved \+\s*Updated\s*:\s*(\d+)/i);
  if (approvedMatch) {
    // Prefer real summary counts once printed.
    const n = Number(approvedMatch[1]);
    if (Number.isFinite(n)) status.savedCount = n;
    markDirty();
  }
  const failedSummaryMatch = trimmed.match(/Failed\s*:\s*(\d+)/i);
  if (failedSummaryMatch) {
    const n = Number(failedSummaryMatch[1]);
    if (Number.isFinite(n)) status.failedCount = n;
    markDirty();
  }

  // Persist occasionally, but throttled in the interval below.
}

function attachStream(stream) {
  let buffer = '';
  stream.on('data', (chunk) => {
    const text = String(chunk);
    buffer += text;
    const parts = buffer.split(/\r?\n/);
    buffer = parts.pop() || '';
    for (const line of parts) updateFromLine(line);
  });
}

let child = null;
let cancelledRequested = false;
let cancelKillTimeout = null;

function cancelRequestedByFlag() {
  if (!cancelFlagFile) return false;
  try {
    return fs.existsSync(cancelFlagFile);
  } catch {
    return false;
  }
}

function cleanupCancelFlag() {
  // Keep the file so the admin can keep polling; don't delete automatically.
}

const statusWriteInterval = setInterval(() => {
  if (statusDirty) {
    // Avoid frequent disk writes if chunks come fast.
    const now = Date.now();
    if (now - lastStatusWriteAt > 800) writeStatus();
  }
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

// Initial status write.
writeStatus();

child = spawn(process.execPath, [updaterScriptPath], {
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe'],
});

child.stdout.setEncoding('utf8');
child.stderr.setEncoding('utf8');
attachStream(child.stdout);
attachStream(child.stderr);

child.on('error', (err) => {
  status.state = 'failed';
  status.lastMessage = err?.message || 'Failed to start updater';
  status.exitCode = null;
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
  cleanupCancelFlag();

  status.exitCode = typeof code === 'number' ? code : null;
  status.finishedAt = new Date().toISOString();
  if (!cancelledRequested) {
    status.state = code === 0 ? 'completed' : 'failed';
  } else {
    status.state = 'cancelled';
  }

  status.lastMessage = status.lastMessage || `Job finished with exit code ${code}`;
  markDirty();
  writeStatus();
});

