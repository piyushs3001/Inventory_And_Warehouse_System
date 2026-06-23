#!/usr/bin/env node
// Standalone dev log viewer — one URL to watch API + Staff + Admin logs together.
//
// Zero dependencies (node:http + node:fs only). Tails the NDJSON/console log
// files the dev servers write into ./logs and live-streams them to a browser
// over Server-Sent Events, with per-source / level / text filtering.
//
//   node tools/log-viewer.mjs        (or: npm run dev:logs)
//   → open http://localhost:5009
//
// Point the dev servers at ./logs first (the run-apps skill does this):
//   setsid nohup npm run dev:api   >logs/api.log   2>&1 &
//   setsid nohup npm run dev:staff >logs/staff.log 2>&1 &
//   setsid nohup npm run dev:admin >logs/admin.log 2>&1 &
//
// Handles files that don't exist yet (waits for them) and truncation/rotation
// (resets to the new start). Parses pino-style JSON lines for level/msg/time;
// falls back to raw text for plain console output.

import { createServer } from 'node:http';
import { existsSync, statSync, openSync, readSync, closeSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PORT = Number(process.env.LOG_VIEWER_PORT ?? 5009);
const LOG_DIR = resolve(ROOT, process.env.LOG_DIR ?? 'logs');
const POLL_MS = 400;
const BACKLOG_BYTES = 64 * 1024; // read at most the last 64KB of each file on connect

// source key -> file name under LOG_DIR
const SOURCES = { api: 'api.log', staff: 'staff.log', admin: 'admin.log' };

// pino numeric levels -> name
const PINO_LEVELS = { 10: 'trace', 20: 'debug', 30: 'info', 40: 'warn', 50: 'error', 60: 'fatal' };

/** @type {Set<import('node:http').ServerResponse>} */
const clients = new Set();
/** per-source byte offset we've already streamed */
const offsets = {};

function pathFor(source) {
  return resolve(LOG_DIR, SOURCES[source]);
}

/** Parse one raw log line into a structured record. */
function parseLine(source, line) {
  const rec = { source, level: 'info', msg: line, time: Date.now() };
  const trimmed = line.trimStart();
  if (trimmed.startsWith('{')) {
    try {
      const o = JSON.parse(trimmed);
      if (typeof o.level === 'number') rec.level = PINO_LEVELS[o.level] ?? 'info';
      else if (typeof o.level === 'string') rec.level = o.level.toLowerCase();
      if (o.time) rec.time = typeof o.time === 'number' ? o.time : Date.parse(o.time) || rec.time;
      rec.msg = o.msg ?? o.message ?? line;
    } catch {
      // not JSON — keep raw
    }
  } else {
    // best-effort level sniff for plain console output
    const m = /\b(error|warn|debug|trace|fatal)\b/i.exec(line);
    if (m) rec.level = m[1].toLowerCase();
  }
  return rec;
}

/** Read bytes [from, size) of a file and return decoded text. */
function readChunk(file, from, size) {
  const len = size - from;
  if (len <= 0) return '';
  const fd = openSync(file, 'r');
  try {
    const buf = Buffer.allocUnsafe(len);
    const read = readSync(fd, buf, 0, len, from);
    return buf.toString('utf8', 0, read);
  } finally {
    closeSync(fd);
  }
}

function send(res, record) {
  res.write(`data: ${JSON.stringify(record)}\n\n`);
}

/** Emit a small synthetic notice line to one client. */
function notice(res, msg) {
  send(res, { source: 'viewer', level: 'debug', msg, time: Date.now() });
}

/** On connect: replay the tail of each existing file to just this client. */
function sendBacklog(res) {
  for (const source of Object.keys(SOURCES)) {
    const file = pathFor(source);
    if (!existsSync(file)) continue;
    const size = statSync(file).size;
    const from = Math.max(0, size - BACKLOG_BYTES);
    const text = readChunk(file, from, size);
    const lines = text.split('\n');
    if (from > 0) lines.shift(); // drop the partial first line
    for (const line of lines) if (line.trim()) send(res, parseLine(source, line));
  }
}

/** Poll every source for appended bytes and broadcast new lines. */
function pollOnce() {
  for (const source of Object.keys(SOURCES)) {
    const file = pathFor(source);
    if (!existsSync(file)) continue;
    let size;
    try {
      size = statSync(file).size;
    } catch {
      continue;
    }
    if (offsets[source] === undefined) {
      offsets[source] = size; // first sight: start at the tail, don't replay history to the loop
      continue;
    }
    if (size < offsets[source]) offsets[source] = 0; // truncated / rotated
    if (size === offsets[source]) continue;

    const text = readChunk(file, offsets[source], size);
    offsets[source] = size;
    const lines = text.split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      const rec = parseLine(source, line);
      for (const res of clients) send(res, rec);
    }
  }
}

const HTML = String.raw`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>IWS — Dev Logs</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background: #0b1020; color: #d7dce5; }
  header { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; gap: 12px; align-items: center;
           padding: 10px 14px; background: #111733; border-bottom: 1px solid #232b4d; }
  header h1 { font-size: 13px; margin: 0 8px 0 0; color: #8ea0ff; letter-spacing: .04em; }
  label { display: inline-flex; align-items: center; gap: 4px; cursor: pointer; user-select: none; }
  input[type="search"] { background: #0b1020; border: 1px solid #2c3563; color: #d7dce5; padding: 4px 8px; border-radius: 6px; min-width: 200px; }
  select { background: #0b1020; border: 1px solid #2c3563; color: #d7dce5; padding: 4px 6px; border-radius: 6px; }
  button { background: #232b4d; border: 1px solid #2c3563; color: #d7dce5; padding: 4px 10px; border-radius: 6px; cursor: pointer; }
  button.on { background: #3a4790; border-color: #4a5ac0; }
  #status { margin-left: auto; font-size: 12px; color: #6b7699; }
  #log { padding: 6px 0 40vh; }
  .row { display: flex; gap: 10px; padding: 1px 14px; white-space: pre-wrap; word-break: break-word; }
  .row:hover { background: #0f152b; }
  .src { flex: 0 0 52px; text-transform: uppercase; font-size: 11px; opacity: .9; }
  .src.api { color: #5ec8ff; } .src.staff { color: #7ee787; } .src.admin { color: #f0a35e; } .src.viewer { color: #6b7699; }
  .lvl { flex: 0 0 46px; font-size: 11px; }
  .lvl.error, .lvl.fatal { color: #ff6b6b; } .lvl.warn { color: #ffd166; } .lvl.info { color: #9aa6c4; }
  .lvl.debug, .lvl.trace { color: #6b7699; }
  .msg { flex: 1 1 auto; }
  .row.error, .row.fatal { background: #2a1320; }
  .t { flex: 0 0 88px; color: #5a6178; font-size: 11px; }
</style></head>
<body>
<header>
  <h1>IWS DEV LOGS</h1>
  <label><input type="checkbox" class="src-f" value="api" checked> api</label>
  <label><input type="checkbox" class="src-f" value="staff" checked> staff</label>
  <label><input type="checkbox" class="src-f" value="admin" checked> admin</label>
  <select id="level">
    <option value="trace">trace+</option><option value="debug">debug+</option>
    <option value="info" selected>info+</option><option value="warn">warn+</option><option value="error">error+</option>
  </select>
  <input type="search" id="q" placeholder="filter text…">
  <button id="pause">⏸ Pause</button>
  <button id="clear">Clear</button>
  <span id="status">connecting…</span>
</header>
<div id="log"></div>
<script>
  const ORDER = { trace:0, debug:1, info:2, warn:3, error:4, fatal:5 };
  const logEl = document.getElementById('log');
  const statusEl = document.getElementById('status');
  const qEl = document.getElementById('q');
  const levelEl = document.getElementById('level');
  let paused = false;
  const buffer = []; // keep records so we can re-filter without reconnecting
  const MAX = 5000;

  function enabledSources() {
    return new Set([...document.querySelectorAll('.src-f:checked')].map(c => c.value));
  }
  function passes(rec) {
    if (!enabledSources().has(rec.source) && rec.source !== 'viewer') return false;
    if ((ORDER[rec.level] ?? 2) < ORDER[levelEl.value]) return false;
    const q = qEl.value.trim().toLowerCase();
    if (q && !(rec.msg || '').toLowerCase().includes(q)) return false;
    return true;
  }
  function fmtTime(t) {
    const d = new Date(t); return d.toLocaleTimeString('en-GB', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3,'0');
  }
  function render(rec) {
    const row = document.createElement('div');
    row.className = 'row ' + rec.level;
    row.innerHTML =
      '<span class="t">' + fmtTime(rec.time) + '</span>' +
      '<span class="src ' + rec.source + '">' + rec.source + '</span>' +
      '<span class="lvl ' + rec.level + '">' + rec.level + '</span>' +
      '<span class="msg"></span>';
    row.querySelector('.msg').textContent = rec.msg;
    return row;
  }
  function repaint() {
    logEl.textContent = '';
    const frag = document.createDocumentFragment();
    for (const rec of buffer) if (passes(rec)) frag.appendChild(render(rec));
    logEl.appendChild(frag);
    window.scrollTo(0, document.body.scrollHeight);
  }
  function add(rec) {
    buffer.push(rec);
    if (buffer.length > MAX) buffer.splice(0, buffer.length - MAX);
    if (paused) return;
    if (passes(rec)) {
      const atBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 40;
      logEl.appendChild(render(rec));
      if (atBottom) window.scrollTo(0, document.body.scrollHeight);
    }
  }
  for (const el of [qEl, levelEl]) el.addEventListener('input', repaint);
  for (const c of document.querySelectorAll('.src-f')) c.addEventListener('change', repaint);
  document.getElementById('clear').onclick = () => { buffer.length = 0; logEl.textContent = ''; };
  const pauseBtn = document.getElementById('pause');
  pauseBtn.onclick = () => { paused = !paused; pauseBtn.classList.toggle('on', paused); pauseBtn.textContent = paused ? '▶ Resume' : '⏸ Pause'; if (!paused) repaint(); };

  const es = new EventSource('/stream');
  es.onopen = () => { statusEl.textContent = 'live'; statusEl.style.color = '#7ee787'; };
  es.onerror = () => { statusEl.textContent = 'reconnecting…'; statusEl.style.color = '#ffd166'; };
  es.onmessage = (e) => { try { add(JSON.parse(e.data)); } catch {} };
</script>
</body></html>`;

const server = createServer((req, res) => {
  if (req.url === '/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('retry: 1000\n\n');
    notice(res, `log-viewer connected — watching ${LOG_DIR}/{api,staff,admin}.log`);
    sendBacklog(res);
    clients.add(res);
    const keepAlive = setInterval(() => res.write(': ping\n\n'), 20000);
    req.on('close', () => { clearInterval(keepAlive); clients.delete(res); });
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(HTML);
});

setInterval(pollOnce, POLL_MS);
server.listen(PORT, () => {
  console.log(`[log-viewer] http://localhost:${PORT}  (watching ${LOG_DIR})`);
  if (!existsSync(LOG_DIR)) console.log(`[log-viewer] note: ${LOG_DIR} does not exist yet — it appears once a dev server writes a log there.`);
});
