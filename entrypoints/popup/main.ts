// Popup controller (docs/08 Bước 5): run controls, realtime results table,
// export, and open-evidence. Talks to the background worker via messages and
// rehydrates from IndexedDB on open so a run in progress is always visible.

import { strongestEvidence, toCSV, toJSON } from '../../lib/export';
import { DEFAULT_RUN_CONFIG } from '../../lib/config';
import {
  verdictLabel,
  loadStatusLabel,
  METHOD_LABEL,
  VERDICT_LEGEND,
  VERDICT_LABEL,
  CONFIDENCE_NOTE,
  USAGE_STEPS,
} from '../../lib/labels';
import type { PopupToBg, ProgressEvent, StateReply } from '../../lib/messages';
import type { Progress, ScanResult, RunConfig, Verdict } from '../../lib/types';

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node as T;
}

const form = el<HTMLFormElement>('run-form');
const queryInput = el<HTMLInputElement>('query');
const limitInput = el<HTMLInputElement>('limit');
const delayInput = el<HTMLInputElement>('delay');
const resolveInput = el<HTMLInputElement>('resolve-exact');
const startBtn = el<HTMLButtonElement>('start');
const pauseBtn = el<HTMLButtonElement>('pause');
const resumeBtn = el<HTMLButtonElement>('resume');
const clearBtn = el<HTMLButtonElement>('clear');
const statusEl = el<HTMLDivElement>('status');
const rowsEl = el<HTMLTableSectionElement>('rows');
const exportCsvBtn = el<HTMLButtonElement>('export-csv');
const exportJsonBtn = el<HTMLButtonElement>('export-json');
const countEl = el<HTMLSpanElement>('count');

/** domain → latest result, preserves insertion order for the table. */
const results = new Map<string, ScanResult>();

function send(msg: PopupToBg) {
  chrome.runtime.sendMessage(msg).catch(() => {});
}

function renderRow(r: ScanResult) {
  const id = `row-${r.domain}`;
  let tr = document.getElementById(id) as HTMLTableRowElement | null;
  if (!tr) {
    tr = document.createElement('tr');
    tr.id = id;
    rowsEl.appendChild(tr);
  }
  const ev = strongestEvidence(r);
  tr.innerHTML = '';

  const tdDomain = document.createElement('td');
  tdDomain.textContent = r.domain;
  // Provenance: URL cuối + thời điểm quét + phiên bản detector (nguồn gốc/độ cũ).
  tdDomain.title = `${r.finalUrl}\nQuét: ${r.scannedAt}\nDetector: v${r.detectorVersion}`;

  const tdVerdict = document.createElement('td');
  const badge = document.createElement('span');
  badge.className = `badge ${r.verdict}`;
  badge.textContent = verdictLabel(r.verdict);
  tdVerdict.appendChild(badge);

  const tdConf = document.createElement('td');
  tdConf.textContent = r.confidence;

  const tdLoad = document.createElement('td');
  tdLoad.textContent = loadStatusLabel(r.loadStatus);

  const tdEvidence = document.createElement('td');
  if (ev.url) {
    const a = document.createElement('a');
    a.href = '#';
    a.className = 'evidence';
    a.textContent = `${METHOD_LABEL[ev.method]}: ${ev.text || ev.url}`.slice(0, 60);
    a.title = ev.url;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: ev.url }); // FR-09 re-verify
    });
    tdEvidence.appendChild(a);
  } else {
    tdEvidence.textContent = '—';
  }

  const tdScore = document.createElement('td');
  tdScore.className = 'num';
  tdScore.textContent = r.trustScore != null ? String(r.trustScore) : '';

  tr.append(tdDomain, tdVerdict, tdConf, tdLoad, tdEvidence, tdScore);
}

function renderAll() {
  rowsEl.innerHTML = '';
  for (const r of results.values()) renderRow(r);
  const n = results.size;
  countEl.textContent = n ? `${n} kết quả` : '';
  const has = n > 0;
  exportCsvBtn.disabled = !has;
  exportJsonBtn.disabled = !has;
}

function applyProgress(p: Progress | null) {
  const running = !!p?.running;
  const paused = !!p?.paused;
  startBtn.disabled = running && !paused;
  pauseBtn.disabled = !running || paused;
  resumeBtn.disabled = !running || !paused;

  if (!p) {
    statusEl.textContent = '';
    return;
  }
  if (p.error) {
    statusEl.textContent = `⚠ ${p.error}`;
    statusEl.className = 'status error';
    return;
  }
  statusEl.className = 'status';
  if (p.running && !paused) {
    const cur = p.currentDomain ? ` — đang quét ${p.currentDomain}` : '';
    statusEl.textContent = `Đang chạy: ${p.completed}/${p.total || '…'}${cur}`;
  } else if (paused) {
    statusEl.textContent = `Tạm dừng: ${p.completed}/${p.total}`;
  } else if (p.total > 0) {
    statusEl.textContent = `Hoàn tất: ${p.completed}/${p.total}`;
  } else {
    statusEl.textContent = '';
  }
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function stamp() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
}

// --- events ---
form.addEventListener('submit', (e) => {
  e.preventDefault();
  results.clear();
  renderAll();
  const run: Partial<RunConfig> = {
    query: queryInput.value.trim() || DEFAULT_RUN_CONFIG.query,
    limit: Number(limitInput.value) || DEFAULT_RUN_CONFIG.limit,
    delayMs: Number(delayInput.value) || DEFAULT_RUN_CONFIG.delayMs,
    resolveViaReviewPage: resolveInput.checked,
  };
  send({ type: 'START', run });
});

pauseBtn.addEventListener('click', () => send({ type: 'PAUSE' }));
resumeBtn.addEventListener('click', () => send({ type: 'RESUME' }));
clearBtn.addEventListener('click', () => {
  send({ type: 'CLEAR' });
  results.clear();
  renderAll();
  applyProgress(null);
});

exportCsvBtn.addEventListener('click', () => {
  download(`affiliate-finder-${stamp()}.csv`, toCSV([...results.values()]), 'text/csv');
});
exportJsonBtn.addEventListener('click', () => {
  download(`affiliate-finder-${stamp()}.json`, toJSON([...results.values()]), 'application/json');
});

// --- live updates from background ---
chrome.runtime.onMessage.addListener((msg: ProgressEvent) => {
  if (msg.type !== 'PROGRESS') return;
  if (msg.result) {
    results.set(msg.result.domain, msg.result);
    renderRow(msg.result);
    countEl.textContent = `${results.size} kết quả`;
    exportCsvBtn.disabled = false;
    exportJsonBtn.disabled = false;
  }
  applyProgress(msg.progress);
});

// --- populate the static guide/legend once ---
function populateHelp() {
  const steps = document.getElementById('usage-steps');
  if (steps) {
    for (const s of USAGE_STEPS) {
      const li = document.createElement('li');
      li.textContent = s;
      steps.appendChild(li);
    }
  }
  const legend = document.getElementById('legend-rows');
  if (legend) {
    for (const v of Object.keys(VERDICT_LEGEND) as Verdict[]) {
      const tr = document.createElement('tr');
      const tdN = document.createElement('td');
      const b = document.createElement('span');
      b.className = `badge ${v}`;
      b.textContent = VERDICT_LABEL[v];
      tdN.appendChild(b);
      const tdM = document.createElement('td');
      tdM.textContent = VERDICT_LEGEND[v].meaning;
      const tdA = document.createElement('td');
      tdA.textContent = VERDICT_LEGEND[v].action;
      tr.append(tdN, tdM, tdA);
      legend.appendChild(tr);
    }
  }
  const note = document.getElementById('confidence-note');
  if (note) note.textContent = CONFIDENCE_NOTE;
}
populateHelp();

// --- rehydrate on open ---
chrome.runtime.sendMessage({ type: 'GET_STATE' } satisfies PopupToBg).then((reply: StateReply) => {
  if (!reply) return;
  for (const r of reply.results ?? []) results.set(r.domain, r);
  if (reply.progress) {
    queryInput.value = reply.progress.query || queryInput.value;
  }
  renderAll();
  applyProgress(reply.progress);
}).catch(() => {});
