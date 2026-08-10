// Popup = bộ khởi chạy nhanh + xem lướt. Vòng lặp quét chạy ở trang dashboard
// (options). "Bắt đầu" ghi yêu cầu chạy vào storage.session rồi mở dashboard.
// Trạng thái/kết quả đọc trực tiếp từ IndexedDB + cập nhật realtime qua PROGRESS.

import { strongestEvidence, toCSV, toJSON } from '../../lib/export';
import { DEFAULT_RUN_CONFIG } from '../../lib/config';
import { getResults, getProgress } from '../../lib/storage';
import { verdictLabel, loadStatusLabel, METHOD_LABEL } from '../../lib/labels';
import { PENDING_RUN_KEY, type ProgressEvent, type PendingRun } from '../../lib/messages';
import type { Progress, ScanResult, RunConfig } from '../../lib/types';

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
const statusEl = el<HTMLDivElement>('status');
const rowsEl = el<HTMLTableSectionElement>('rows');
const exportCsvBtn = el<HTMLButtonElement>('export-csv');
const exportJsonBtn = el<HTMLButtonElement>('export-json');
const openDashboardBtn = el<HTMLButtonElement>('open-dashboard');
const countEl = el<HTMLSpanElement>('count');

const results = new Map<string, ScanResult>();

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
  tdDomain.title = `${r.finalUrl}\nQuét: ${r.scannedAt}\nDetector: v${r.detectorVersion}`;

  const tdVerdict = document.createElement('td');
  const b = document.createElement('span');
  b.className = `badge ${r.verdict}`;
  b.textContent = verdictLabel(r.verdict);
  tdVerdict.appendChild(b);

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
    a.addEventListener('click', (e) => { e.preventDefault(); chrome.tabs.create({ url: ev.url }); });
    tdEvidence.appendChild(a);
  } else tdEvidence.textContent = '—';

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
  exportCsvBtn.disabled = n === 0;
  exportJsonBtn.disabled = n === 0;
}

function applyProgress(p: Progress | null) {
  const busy = !!p?.running && !p?.paused;
  startBtn.disabled = busy;
  if (!p) { statusEl.textContent = ''; statusEl.className = 'status'; return; }
  if (p.error) { statusEl.textContent = `⚠ ${p.error}`; statusEl.className = 'status error'; return; }
  statusEl.className = 'status';
  if (busy) {
    const cur = p.currentDomain ? ` — ${p.currentDomain}` : '';
    statusEl.textContent = `Đang chạy: ${p.completed}/${p.total || '…'}${cur} (ở bảng điều khiển)`;
  } else if (p.paused) {
    statusEl.textContent = `Tạm dừng: ${p.completed}/${p.total}`;
  } else if (p.total > 0) {
    statusEl.textContent = `Hoàn tất: ${p.completed}/${p.total}`;
  } else statusEl.textContent = '';
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
const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

// ---------- events ----------
// Start: hand the run to the dashboard (which owns the loop) via storage.session,
// then open it. This is why long runs no longer depend on the popup staying open.
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pending: PendingRun = {
    run: {
      query: queryInput.value.trim() || DEFAULT_RUN_CONFIG.query,
      limit: Number(limitInput.value) || DEFAULT_RUN_CONFIG.limit,
      delayMs: Number(delayInput.value) || DEFAULT_RUN_CONFIG.delayMs,
      resolveViaReviewPage: resolveInput.checked,
    } satisfies Partial<RunConfig>,
    mode: 'new',
  };
  try {
    await chrome.storage.session.set({ [PENDING_RUN_KEY]: pending });
  } catch { /* ignore */ }
  chrome.runtime.openOptionsPage();
  window.close();
});

openDashboardBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
exportCsvBtn.addEventListener('click', () => download(`affiliate-finder-${stamp()}.csv`, toCSV([...results.values()]), 'text/csv'));
exportJsonBtn.addEventListener('click', () => download(`affiliate-finder-${stamp()}.json`, toJSON([...results.values()]), 'application/json'));

chrome.runtime.onMessage.addListener((msg: ProgressEvent) => {
  if (msg.type !== 'PROGRESS') return;
  if (msg.result) { results.set(msg.result.domain, msg.result); renderRow(msg.result); }
  countEl.textContent = `${results.size} kết quả`;
  exportCsvBtn.disabled = results.size === 0;
  exportJsonBtn.disabled = results.size === 0;
  applyProgress(msg.progress);
});

// ---------- init: read state straight from IndexedDB ----------
async function init() {
  for (const r of await getResults()) results.set(r.domain, r);
  const progress = await getProgress();
  if (progress) queryInput.value = progress.query || queryInput.value;
  renderAll();
  applyProgress(progress);
}
void init();
