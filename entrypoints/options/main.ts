// Dashboard (trang options, mở trong tab) — CHỦ trì vòng lặp quét qua lib/run-engine
// (không dùng service worker → chạy dài không bị Chrome kill). Bảng lớn có lọc/
// sắp xếp/tìm + chi tiết mọi bằng chứng. IndexedDB là nguồn sự thật; popup chỉ xem.

import { runScan, resumeIfInterrupted, type RunMode } from '../../lib/run-engine';
import { getResults, getProgress, setProgress, clearRun } from '../../lib/storage';
import { strongestEvidence, toCSV, toJSON } from '../../lib/export';
import { DEFAULT_RUN_CONFIG } from '../../lib/config';
import {
  verdictLabel,
  confidenceLabel,
  loadStatusLabel,
  METHOD_LABEL,
  VERDICT_LEGEND,
  VERDICT_LABEL,
  CONFIDENCE_NOTE,
  USAGE_STEPS,
} from '../../lib/labels';
import { getEffectiveConfig, setConfigOverride, clearConfigOverride } from '../../lib/detector-config';
import { PENDING_RUN_KEY, type ProgressEvent, type PendingRun } from '../../lib/messages';
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
const staleDaysInput = el<HTMLInputElement>('stale-days');
const resolveInput = el<HTMLInputElement>('resolve-exact');
const startBtn = el<HTMLButtonElement>('start');
const refreshStaleBtn = el<HTMLButtonElement>('refresh-stale');
const restartBtn = el<HTMLButtonElement>('restart');
const pauseBtn = el<HTMLButtonElement>('pause');
const resumeBtn = el<HTMLButtonElement>('resume');
const clearBtn = el<HTMLButtonElement>('clear');
const statusEl = el<HTMLDivElement>('status');
const rowsEl = el<HTMLTableSectionElement>('rows');
const emptyEl = el<HTMLParagraphElement>('empty');
const searchEl = el<HTMLInputElement>('search');
const filterEl = el<HTMLSelectElement>('filter');
const sortEl = el<HTMLSelectElement>('sort');
const countEl = el<HTMLSpanElement>('count');
const exportCsvBtn = el<HTMLButtonElement>('export-csv');
const exportJsonBtn = el<HTMLButtonElement>('export-json');
const cfgStrong = el<HTMLTextAreaElement>('cfg-strong');
const cfgWeak = el<HTMLTextAreaElement>('cfg-weak');
const cfgPlatforms = el<HTMLTextAreaElement>('cfg-platforms');
const cfgPaths = el<HTMLTextAreaElement>('cfg-paths');
const cfgSaveBtn = el<HTMLButtonElement>('cfg-save');
const cfgResetBtn = el<HTMLButtonElement>('cfg-reset');
const cfgStatus = el<HTMLSpanElement>('cfg-status');

const results = new Map<string, ScanResult>();
const expanded = new Set<string>();

function num(v: number | null | undefined): number {
  return typeof v === 'number' ? v : -1;
}

function readRunPartial(): Partial<RunConfig> {
  return {
    query: queryInput.value.trim() || DEFAULT_RUN_CONFIG.query,
    limit: Number(limitInput.value) || DEFAULT_RUN_CONFIG.limit,
    delayMs: Number(delayInput.value) || DEFAULT_RUN_CONFIG.delayMs,
    staleDays: Number(staleDaysInput.value) || DEFAULT_RUN_CONFIG.staleDays,
    resolveViaReviewPage: resolveInput.checked,
  };
}

// ---------- rendering ----------
function view(): ScanResult[] {
  const q = searchEl.value.trim().toLowerCase();
  const f = filterEl.value;
  let list = [...results.values()];
  if (q) list = list.filter((r) => r.domain.toLowerCase().includes(q));
  if (f !== 'all') list = list.filter((r) => r.verdict === f);

  const order: Record<Verdict, number> = { affiliate: 0, partner_trade: 1, none: 2, unknown: 3 };
  switch (sortEl.value) {
    case 'trustScore': list.sort((a, b) => num(b.trustScore) - num(a.trustScore)); break;
    case 'reviews': list.sort((a, b) => num(b.reviews) - num(a.reviews)); break;
    case 'domain': list.sort((a, b) => a.domain.localeCompare(b.domain)); break;
    case 'verdict': list.sort((a, b) => order[a.verdict] - order[b.verdict]); break;
    default: break;
  }
  return list;
}

function badge(v: Verdict): HTMLSpanElement {
  const b = document.createElement('span');
  b.className = `badge ${v}`;
  b.textContent = verdictLabel(v);
  return b;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
}

function evidenceCell(r: ScanResult): HTMLTableCellElement {
  const td = document.createElement('td');
  const ev = strongestEvidence(r);
  if (ev.url) {
    const a = document.createElement('a');
    a.href = '#';
    a.className = 'evidence';
    a.textContent = `${METHOD_LABEL[ev.method]}: ${ev.text || ev.url}`.slice(0, 80);
    a.title = ev.url;
    a.addEventListener('click', (e) => { e.preventDefault(); chrome.tabs.create({ url: ev.url }); });
    td.appendChild(a);
  } else td.textContent = '—';
  return td;
}

function detailRow(r: ScanResult): HTMLTableRowElement {
  const tr = document.createElement('tr');
  tr.className = 'detail';
  const td = document.createElement('td');
  td.colSpan = 8;
  const meta = document.createElement('div');
  meta.className = 'detail-meta';
  meta.innerHTML =
    `<div><b>URL cuối:</b> <a href="${r.finalUrl}" target="_blank" rel="noreferrer">${escapeHtml(r.finalUrl)}</a></div>` +
    `<div><b>Quét lúc:</b> ${escapeHtml(r.scannedAt)} · <b>Detector:</b> v${escapeHtml(r.detectorVersion)} · <b>Junk baseline:</b> ${r.evidence.junkBaselineStatus ?? '—'}</div>`;
  td.appendChild(meta);

  const { linkHits, platformHits, pathHits } = r.evidence;
  if (platformHits.length) {
    const p = document.createElement('div');
    p.className = 'detail-block';
    p.innerHTML = `<b>Nền tảng affiliate:</b> ${escapeHtml(platformHits.join(', '))}`;
    td.appendChild(p);
  }
  if (linkHits.length) {
    const wrap = document.createElement('div');
    wrap.className = 'detail-block';
    wrap.innerHTML = `<b>Liên kết khớp (${linkHits.length}):</b>`;
    const ul = document.createElement('ul');
    for (const h of linkHits) {
      const li = document.createElement('li');
      li.innerHTML =
        `<span class="tag ${h.isStrong ? 'strong' : 'weak'}">${h.isStrong ? 'mạnh' : 'yếu'}</span> ` +
        `${escapeHtml(h.text || '(không có chữ)')} — ` +
        `<a href="${h.href}" target="_blank" rel="noreferrer">${escapeHtml(h.href || '(không href)')}</a>` +
        (h.kw.length ? ` <span class="muted">[${escapeHtml(h.kw.join(', '))}]</span>` : '');
      ul.appendChild(li);
    }
    wrap.appendChild(ul);
    td.appendChild(wrap);
  }
  if (pathHits.length) {
    const wrap = document.createElement('div');
    wrap.className = 'detail-block';
    wrap.innerHTML = `<b>Đường dẫn dò được (${pathHits.length}):</b>`;
    const ul = document.createElement('ul');
    for (const p of pathHits) {
      const li = document.createElement('li');
      li.innerHTML =
        `<span class="tag ${p.isStrong ? 'strong' : 'weak'}">${p.isStrong ? 'mạnh' : 'yếu'}</span> ` +
        `${escapeHtml(p.path)} → HTTP ${p.status} ` +
        `<a href="${p.finalUrl || p.path}" target="_blank" rel="noreferrer">mở</a>`;
      ul.appendChild(li);
    }
    wrap.appendChild(ul);
    td.appendChild(wrap);
  }
  if (!platformHits.length && !linkHits.length && !pathHits.length) {
    const none = document.createElement('div');
    none.className = 'detail-block muted';
    none.textContent =
      r.loadStatus === 'ok'
        ? 'Không có bằng chứng nào (đã quét, true negative).'
        : 'Không quét được nội dung (bị chặn/lỗi) — chưa thể kết luận.';
    td.appendChild(none);
  }
  tr.appendChild(td);
  return tr;
}

function render() {
  const list = view();
  rowsEl.innerHTML = '';
  for (const r of list) {
    const tr = document.createElement('tr');
    const tdToggle = document.createElement('td');
    tdToggle.className = 'tiny';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toggle';
    btn.textContent = expanded.has(r.domain) ? '▾' : '▸';
    btn.addEventListener('click', () => {
      if (expanded.has(r.domain)) expanded.delete(r.domain);
      else expanded.add(r.domain);
      render();
    });
    tdToggle.appendChild(btn);

    const tdDomain = document.createElement('td');
    tdDomain.textContent = r.domain;
    tdDomain.title = r.finalUrl;
    const tdVerdict = document.createElement('td');
    tdVerdict.appendChild(badge(r.verdict));
    const tdConf = document.createElement('td');
    tdConf.textContent = confidenceLabel(r.confidence);
    const tdLoad = document.createElement('td');
    tdLoad.textContent = loadStatusLabel(r.loadStatus);
    const tdScore = document.createElement('td');
    tdScore.className = 'num';
    tdScore.textContent = r.trustScore != null ? String(r.trustScore) : '';
    const tdReviews = document.createElement('td');
    tdReviews.className = 'num';
    tdReviews.textContent = r.reviews != null ? String(r.reviews) : '';

    tr.append(tdToggle, tdDomain, tdVerdict, tdConf, tdLoad, tdScore, tdReviews, evidenceCell(r));
    rowsEl.appendChild(tr);
    if (expanded.has(r.domain)) rowsEl.appendChild(detailRow(r));
  }
  const total = results.size;
  countEl.textContent = total ? `Hiện ${list.length}/${total}` : '';
  emptyEl.style.display = total ? 'none' : 'block';
  exportCsvBtn.disabled = total === 0;
  exportJsonBtn.disabled = total === 0;
}

function applyProgress(p: Progress | null) {
  const running = !!p?.running;
  const paused = !!p?.paused;
  const busy = running && !paused;
  startBtn.disabled = busy;
  refreshStaleBtn.disabled = busy;
  restartBtn.disabled = busy;
  clearBtn.disabled = busy;
  pauseBtn.disabled = !busy;
  resumeBtn.disabled = !(running && paused);

  if (!p) { statusEl.textContent = ''; statusEl.className = 'status'; return; }
  if (p.error) { statusEl.textContent = `⚠ ${p.error}`; statusEl.className = 'status error'; return; }
  statusEl.className = 'status';
  if (busy) {
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

function broadcast(progress: Progress, result?: ScanResult) {
  const msg: ProgressEvent = { type: 'PROGRESS', progress, result };
  chrome.runtime.sendMessage(msg).catch(() => {});
}

// 1x1 png so chrome.notifications has a valid iconUrl (best-effort).
const NOTIF_ICON =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function notifyDone(summary: { completed: number; total: number }) {
  try {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: NOTIF_ICON,
      title: 'Trình dò Affiliate/Partner',
      message: `Đã quét xong ${summary.completed}/${summary.total} công ty.`,
    });
  } catch {
    /* notifications unavailable — status text already shows completion */
  }
}

const hooks = {
  onProgress: (p: Progress, r?: ScanResult) => {
    if (r) results.set(r.domain, r);
    render();
    applyProgress(p);
    broadcast(p, r);
  },
  onError: (msg: string) => {
    statusEl.textContent = `⚠ ${msg}`;
    statusEl.className = 'status error';
  },
  onDone: (summary: { completed: number; total: number }) => notifyDone(summary),
};

// In-tab guard: never launch two loops in THIS dashboard at once (the session
// lock only guards ACROSS tabs).
let localBusy = false;
async function guarded(fn: () => Promise<void>) {
  if (localBusy) return;
  localBusy = true;
  try {
    await fn();
  } finally {
    localBusy = false;
  }
}

async function start(mode: RunMode) {
  await guarded(() => runScan(readRunPartial(), mode, hooks));
}

function applyPending(pending: PendingRun) {
  if (typeof pending.run.query === 'string') queryInput.value = pending.run.query;
  if (typeof pending.run.limit === 'number') limitInput.value = String(pending.run.limit);
  if (typeof pending.run.delayMs === 'number') delayInput.value = String(pending.run.delayMs);
  resolveInput.checked = !!pending.run.resolveViaReviewPage;
  void start(pending.mode);
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

function populateHelp() {
  const steps = document.getElementById('usage-steps');
  if (steps) for (const s of USAGE_STEPS) { const li = document.createElement('li'); li.textContent = s; steps.appendChild(li); }
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

// ---------- events ----------
form.addEventListener('submit', (e) => { e.preventDefault(); void start('new'); });
refreshStaleBtn.addEventListener('click', () => void start('refreshStale'));
restartBtn.addEventListener('click', () => {
  if (confirm('Xoá toàn bộ kết quả đã lưu và quét lại từ đầu?')) void start('restart');
});
pauseBtn.addEventListener('click', async () => {
  const p = await getProgress();
  if (p) { await setProgress({ ...p, paused: true }); applyProgress({ ...p, paused: true }); }
});
resumeBtn.addEventListener('click', async () => {
  const p = await getProgress();
  if (p) await setProgress({ ...p, paused: false });
  void guarded(() => resumeIfInterrupted(hooks).then(() => {}));
});

// A run requested from the popup while THIS dashboard is already open.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'session') return;
  const pr = changes[PENDING_RUN_KEY]?.newValue as PendingRun | undefined;
  if (!pr) return;
  void chrome.storage.session.remove(PENDING_RUN_KEY); // consume regardless (review L1)
  if (localBusy) return; // a run is already active in this tab — drop the request
  applyPending(pr);
});
clearBtn.addEventListener('click', async () => {
  if (!confirm('Xoá toàn bộ dữ liệu đã lưu (kết quả, công ty)?')) return;
  await clearRun();
  results.clear();
  expanded.clear();
  render();
  applyProgress(null);
});
searchEl.addEventListener('input', render);
filterEl.addEventListener('change', render);
sortEl.addEventListener('change', render);
exportCsvBtn.addEventListener('click', () => download(`affiliate-finder-${stamp()}.csv`, toCSV([...results.values()]), 'text/csv'));
exportJsonBtn.addEventListener('click', () => download(`affiliate-finder-${stamp()}.json`, toJSON([...results.values()]), 'application/json'));

// live updates from another dashboard instance (belt-and-suspenders)
chrome.runtime.onMessage.addListener((msg: ProgressEvent) => {
  if (msg.type !== 'PROGRESS') return;
  if (msg.result) results.set(msg.result.domain, msg.result);
  render();
  applyProgress(msg.progress);
});

// ---------- config editor (Đợt 3 / NFR-05) ----------
/** Parse a textarea into a clean, deduped, lowercased list. */
function parseList(text: string): string[] {
  const items = text
    .split(/[\n,]/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
  return [...new Set(items)];
}

async function loadConfigEditor() {
  const eff = await getEffectiveConfig();
  cfgStrong.value = eff.strong.join('\n');
  cfgWeak.value = eff.weak.join('\n');
  cfgPlatforms.value = eff.platforms.join('\n');
  cfgPaths.value = eff.paths.join('\n');
}

cfgSaveBtn.addEventListener('click', async () => {
  await setConfigOverride({
    strong: parseList(cfgStrong.value),
    weak: parseList(cfgWeak.value),
    platforms: parseList(cfgPlatforms.value),
    paths: parseList(cfgPaths.value),
  });
  await loadConfigEditor(); // re-normalize the textareas from the merged result
  cfgStatus.textContent = 'Đã lưu. Áp dụng cho các lần quét sau.';
  setTimeout(() => (cfgStatus.textContent = ''), 4000);
});

cfgResetBtn.addEventListener('click', async () => {
  await clearConfigOverride();
  await loadConfigEditor();
  cfgStatus.textContent = 'Đã khôi phục mặc định.';
  setTimeout(() => (cfgStatus.textContent = ''), 4000);
});

// ---------- init ----------
async function init() {
  void loadConfigEditor();
  populateHelp();
  for (const r of await getResults()) results.set(r.domain, r);
  const progress = await getProgress();
  if (progress) queryInput.value = progress.query || queryInput.value;
  render();
  applyProgress(progress);

  // 1) A run requested from the popup? (handed off via storage.session)
  let pending: PendingRun | undefined;
  try {
    pending = (await chrome.storage.session.get(PENDING_RUN_KEY))[PENDING_RUN_KEY] as PendingRun | undefined;
    if (pending) await chrome.storage.session.remove(PENDING_RUN_KEY);
  } catch { /* ignore */ }
  if (pending) {
    applyPending(pending);
    return;
  }

  // 2) Otherwise, resume a run interrupted by a previous tab close.
  void guarded(() => resumeIfInterrupted(hooks).then(() => {}));
}
void init();
