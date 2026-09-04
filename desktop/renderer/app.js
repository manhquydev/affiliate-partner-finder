/** Renderer: job workspace (list + preview) over the preload bridge. */

const STORAGE_KEY = 'apf-last-query';

const api = window.affiliateDesktop;

const STATE_LABELS = {
  idle: 'Chờ',
  running: 'Đang chạy',
  stopping: 'Đang dừng…',
  error: 'Lỗi',
  done: 'Xong',
  resume: 'Tiếp tục',
};

let cachedRuns = [];
let lastStatus = null;

function $(id) {
  return document.getElementById(id);
}

function friendlyError(e) {
  const raw = e?.message || String(e);
  return raw.replace(/^Error invoking remote method '[^']+':\s*(?:Error:\s*)?/i, '');
}

function saveLastQuery(q) {
  try {
    const trimmed = String(q || '').trim();
    if (trimmed) localStorage.setItem(STORAGE_KEY, trimmed);
  } catch {
    /* ignore */
  }
}

function loadLastQuery() {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function setQueryInput(value, { readonly = false } = {}) {
  const el = $('query');
  el.value = value || '';
  el.readOnly = readonly;
  el.setAttribute('aria-readonly', readonly ? 'true' : 'false');
}

function setOutPath(path) {
  const el = $('out');
  el.value = path || '';
  el.title = path || '';
}

function parseLimitInput(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return 20;
  const grouped = /^\d{1,2}[.,]\d{3}$/.test(s) ? s.replace(/[.,]/g, '') : s.replace(/,/g, '');
  const n = Number(grouped);
  if (!Number.isFinite(n)) return 20;
  return Math.min(10000, Math.max(1, Math.trunc(n)));
}

function pct(completed, total) {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.round((100 * completed) / total));
}

function formatRelative(mtime) {
  if (!mtime) return '';
  const delta = Date.now() - mtime;
  if (delta < 45_000) return 'Vừa xong';
  if (delta < 3_600_000) return `${Math.max(1, Math.round(delta / 60_000))} phút trước`;
  const date = new Date(mtime);
  const now = new Date();
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) return `Hôm nay ${hh}:${mm}`;
  if (delta < 86_400_000) return `${Math.max(1, Math.round(delta / 3_600_000))} giờ trước`;
  return date.toLocaleDateString('vi-VN');
}

function runState(run, status) {
  if (status?.outDir && status.outDir === run.path) {
    if (status.state === 'running' || status.state === 'stopping' || status.state === 'error') {
      return status.state;
    }
  }
  if (run.total > 0 && run.completed >= run.total) return 'done';
  const files = Array.isArray(run.artefacts) ? run.artefacts : [];
  if (files.includes('companies.csv') && !files.includes('results.csv') && run.completed > 0) {
    return 'done';
  }
  if (run.canResume) return 'resume';
  return 'idle';
}

function folderName(path) {
  if (!path) return 'Job mới';
  const parts = String(path).split(/[/\\]/).filter(Boolean);
  return parts[parts.length - 1] || path;
}

const FILE_ROWS = [
  { file: 'companies.csv', action: 'Mở danh sách' },
  { file: 'results.csv', action: 'Mở kết quả' },
  { file: 'results.full.csv', action: 'Mở đầy đủ' },
];

function renderFileRows(artefacts, outPath) {
  const host = $('fileRows');
  if (!host) return;
  const names = Array.isArray(artefacts) ? artefacts : [];
  const visible = FILE_ROWS.filter((row) => names.includes(row.file));
  host.replaceChildren();
  host.hidden = visible.length === 0;
  for (const row of visible) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'file-row';
    btn.disabled = !outPath;
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('class', 'icon');
    icon.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#i-csv');
    icon.appendChild(use);
    const name = document.createElement('span');
    name.className = 'file-row-name';
    name.textContent = row.file;
    const action = document.createElement('span');
    action.className = 'file-row-action';
    action.textContent = row.action;
    btn.append(icon, name, action);
    btn.addEventListener('click', async () => {
      try {
        await api.openJobFile(outPath, row.file);
      } catch (e) {
        $('message').textContent = friendlyError(e);
        $('message').classList.add('is-error');
      }
    });
    host.appendChild(btn);
  }
}

function renderEta(eta, { running, completed, total }) {
  const el = $('progressEta');
  if (!el) return;

  if (!running || !total || completed >= total) {
    if (!running && eta?.relativeLabel && completed > 0 && completed < total) {
      el.hidden = false;
      el.dataset.stalled = eta.stalled ? 'true' : 'false';
      el.dataset.confidence = eta.confidence || 'none';
      el.innerHTML = '';
      el.appendChild(document.createTextNode(`Lần chạy trước: ${eta.relativeLabel}`));
      if (eta.rateLabel) {
        const rate = document.createElement('span');
        rate.className = 'eta-rate';
        rate.textContent = eta.rateLabel;
        el.appendChild(rate);
      }
      return;
    }
    el.hidden = true;
    el.textContent = '';
    el.dataset.stalled = 'false';
    el.dataset.confidence = 'none';
    return;
  }

  if (!eta) {
    el.hidden = false;
    el.dataset.stalled = 'false';
    el.dataset.confidence = 'none';
    el.textContent = 'ETA: đang đo tốc độ…';
    return;
  }

  el.hidden = false;
  el.dataset.stalled = eta.stalled ? 'true' : 'false';
  el.dataset.confidence = eta.confidence || 'none';
  el.innerHTML = '';
  el.appendChild(document.createTextNode(eta.relativeLabel || 'ETA: đang đo tốc độ…'));
  if (eta.rateLabel) {
    const rate = document.createElement('span');
    rate.className = 'eta-rate';
    rate.textContent = eta.rateLabel;
    el.appendChild(rate);
  }
}

function formatRunOption(run) {
  const q = run.query ? ` · ${run.query}` : '';
  const prog = run.total > 0 ? ` · ${run.completed}/${run.total}` : '';
  const tag = run.canResume ? ' [tiếp tục]' : '';
  return `${run.name}${q}${prog}${tag}`;
}

let lastScrolledPath = '';

function filterRuns(runs) {
  const q = ($('jobFilter')?.value || '').trim().toLowerCase();
  const list = Array.isArray(runs) ? runs.slice() : [];
  if (!q) return list;
  return list.filter((run) => {
    const name = String(run.name || '').toLowerCase();
    const query = String(run.query || '').toLowerCase();
    return name.includes(q) || query.includes(q);
  });
}

function renderJobTable() {
  const tbody = $('jobTableBody');
  const empty = $('jobListEmpty');
  const sel = $('runPicker');
  const current = $('out').value.trim();
  const visible = filterRuns(cachedRuns);

  tbody.replaceChildren();
  sel.innerHTML = '<option value="">Chọn job để tiếp tục</option>';

  for (const run of cachedRuns) {
    const opt = document.createElement('option');
    opt.value = run.path;
    opt.textContent = formatRunOption(run);
    if (run.path === current) opt.selected = true;
    sel.appendChild(opt);
  }

  empty.hidden = cachedRuns.length > 0;

  if (current && !cachedRuns.some((r) => r.path === current)) {
    const synthetic = {
      path: current,
      name: folderName(current),
      query: $('query').value.trim(),
      completed: lastStatus?.progress?.completed ?? 0,
      total: lastStatus?.progress?.total ?? 0,
      mtime: Date.now(),
      canResume: false,
    };
    visible.unshift(synthetic);
  }

  for (const run of visible) {
    const tr = document.createElement('tr');
    tr.tabIndex = 0;
    tr.dataset.path = run.path;
    tr.setAttribute('aria-selected', run.path === current ? 'true' : 'false');

    const state = runState(run, lastStatus);
    const percent = pct(run.completed, run.total);

    const nameTd = document.createElement('td');
    const nameWrap = document.createElement('div');
    nameWrap.className = 'job-name';
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('class', 'icon');
    icon.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#i-folder');
    icon.appendChild(use);
    const nameText = document.createElement('span');
    nameText.textContent = run.name || folderName(run.path);
    nameWrap.append(icon, nameText);
    nameTd.appendChild(nameWrap);

    const queryTd = document.createElement('td');
    queryTd.className = 'job-query-cell';
    queryTd.textContent = run.query || '';
    queryTd.title = run.query || '';

    const progTd = document.createElement('td');
    const mini = document.createElement('div');
    mini.className = 'mini-progress';
    const track = document.createElement('div');
    track.className = 'mini-track';
    const fill = document.createElement('div');
    fill.className = 'mini-fill';
    fill.style.width = `${percent}%`;
    track.appendChild(fill);
    const frac = document.createElement('span');
    frac.className = 'mini-frac';
    frac.textContent = run.total > 0 ? `${run.completed}/${run.total}` : '';
    mini.append(track, frac);
    progTd.appendChild(mini);

    const stateTd = document.createElement('td');
    const pill = document.createElement('span');
    pill.className = 'pill';
    pill.dataset.state = state;
    pill.textContent = STATE_LABELS[state] || state;
    stateTd.appendChild(pill);

    const timeTd = document.createElement('td');
    timeTd.className = 'job-mtime';
    timeTd.textContent = formatRelative(run.mtime);

    tr.append(nameTd, queryTd, progTd, stateTd, timeTd);
    tr.addEventListener('click', () => {
      void applyOutPath(run.path);
    });
    tr.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        tr.click();
      }
    });
    tbody.appendChild(tr);
  }

  const selected = tbody.querySelector('tr[aria-selected="true"]');
  if (selected && current && current !== lastScrolledPath) {
    lastScrolledPath = current;
    selected.scrollIntoView({ block: 'nearest' });
  }
}

async function refreshRunPicker(selectPath, { forceSelect = true } = {}) {
  if (!api?.listRuns) return;
  const { runs } = await api.listRuns();
  cachedRuns = runs || [];
  if (selectPath && forceSelect) setOutPath(selectPath);
  renderJobTable();
}

function selectedRun() {
  const path = $('out').value.trim();
  if (!path) return null;
  return cachedRuns.find((r) => r.path === path) || null;
}

function renderStatus(s) {
  if (!s) return;
  lastStatus = s;
  const running = s.state === 'running' || s.state === 'stopping';
  const pathMatch = Boolean(s.outDir && s.outDir === $('out').value.trim());
  const run = selectedRun();
  const p = pathMatch && s.progress
    ? s.progress
    : run
      ? { query: run.query, completed: run.completed, total: run.total }
      : s.progress;
  const completed = p?.completed ?? 0;
  const total = p?.total ?? 0;
  const percent = pct(completed, total);

  const badge = $('stateBadge');
  const badgeState = pathMatch && running ? s.state : run ? runState(run, s) : s.state;
  badge.textContent = STATE_LABELS[badgeState] || badgeState;
  badge.dataset.state = badgeState === 'done' || badgeState === 'resume' ? s.state : badgeState;
  const liveDot = $('liveDot');
  if (liveDot) liveDot.dataset.state = badgeState;
  $('dashboard').dataset.running = running && pathMatch ? 'true' : 'false';

  $('progressFraction').textContent =
    total > 0 ? `${completed} / ${total} website` : '0 / 0 website';
  $('progressFill').style.transform = `scaleX(${percent / 100})`;
  const track = $('progressTrack');
  track.setAttribute('aria-valuenow', String(percent));
  track.setAttribute('aria-valuetext', `${completed} trên ${total} website`);

  const requested = typeof p?.requestedLimit === 'number' ? p.requestedLimit : 0;
  const collecting = p?.phase === 'collect';
  const stopReason = p?.collectStopReason || '';
  const shortCollect = !collecting && requested > total && total > 0;
  let shortNote = '';
  if (shortCollect) {
    if (stopReason === 'challenge-stop') {
      shortNote =
        ` Chỉ lấy được ${total}/${requested} vì Trustpilot chặn giữa chừng. Tắt “Ẩn cửa sổ Chrome”, bấm Lấy danh sách lại.`;
    } else if (stopReason === 'max-pages') {
      shortNote = ` Chỉ lấy được ${total}/${requested} (hết số trang tìm).`;
    } else {
      shortNote = ` Trustpilot chỉ trả về ${total} website cho từ khoá này (bạn yêu cầu ${requested}).`;
    }
  }

  const artefacts = pathMatch && Array.isArray(s.artefacts) ? s.artefacts : run?.artefacts;
  const hasListCsv = Array.isArray(artefacts) && artefacts.includes('companies.csv');
  if (collecting) {
    const cap = requested || total;
    $('progressFraction').textContent =
      cap > 0 ? `Đã lấy ${completed} / ${cap} từ Trustpilot` : 'Đang lấy danh sách Trustpilot…';
    if (running) {
      $('progressHint').textContent = 'Đang lấy danh sách website trên Trustpilot, chưa quét từng site.';
    } else if (hasListCsv || (pathMatch && s.message === 'Đã lấy danh sách.')) {
      $('progressHint').textContent = 'Đã lấy danh sách. Mở companies.csv hoặc Tiếp tục để quét website.';
    } else {
      $('progressHint').textContent = 'Đã dừng lúc lấy danh sách. Bấm Lấy danh sách lại hoặc Tiếp tục nếu đã có danh sách.';
    }
  } else if (running && total > 0) {
    $('progressHint').textContent =
      (percent >= 100 ? 'Đang hoàn tất và ghi CSV…' : `Đang quét website, còn ${total - completed} website`) +
      shortNote;
  } else if (p && completed > 0) {
    $('progressHint').textContent =
      `Đã xử lý ${completed} website. Có thể Tiếp tục hoặc mở CSV.` + shortNote;
  } else {
    $('progressHint').textContent = 'Sẵn sàng lấy danh sách website hoặc tiếp tục job cũ.';
  }

  renderEta(pathMatch ? s.eta : null, {
    running: running && pathMatch,
    completed,
    total,
  });

  const jobQuery = (p?.query || run?.query || $('query').value).trim();
  const title = $('previewTitle');
  const outPath = $('out').value.trim() || s.outDir || '';
  title.textContent = outPath ? folderName(outPath) : 'Job mới';
  $('jobQuery').textContent = jobQuery
    ? `Từ khoá job: ${jobQuery}`
    : outPath
      ? 'Chưa có từ khoá trên job này. Nhập rồi Lấy danh sách.'
      : 'Chưa chọn job. Điền từ khoá rồi Lấy danh sách.';

  if (running && pathMatch) setQueryInput($('query').value || jobQuery || '', { readonly: true });
  else {
    setQueryInput($('query').value, { readonly: false });
    if (jobQuery && !$('query').value.trim()) $('query').value = jobQuery;
  }

  const c =
    pathMatch && s.counts ? s.counts : { true: 0, false: 0, unknown: 0 };
  $('statTrue').textContent = String(c.true);
  $('statFalse').textContent = String(c.false);
  $('statUnknown').textContent = String(c.unknown);
  const showCounts = c.true + c.false + c.unknown > 0;
  $('countRow').hidden = !showCounts;

  const domains = pathMatch && s.currentDomains?.length ? s.currentDomains : [];
  $('current').textContent = domains.length ? domains.join(', ') : '';
  $('current').classList.toggle('is-active', domains.length > 0);

  if (s.state !== 'error') {
    $('query').classList.remove('is-error');
    if (!$('message').classList.contains('is-error') || !s.message) {
      $('message').classList.remove('is-error');
    }
  }
  if (s.message) {
    $('message').textContent = s.message;
    $('message').classList.toggle('is-error', s.state === 'error');
  } else if (!$('message').classList.contains('is-error')) {
    $('message').textContent = '';
  }
  $('btnStart').disabled = running;
  $('btnCollectList').disabled = running;
  $('btnResume').disabled = running;
  $('btnStop').disabled = !running;
  $('btnPickOut').disabled = false;
  $('btnNewOut').disabled = false;
  $('runPicker').disabled = false;
  $('jobFilter').disabled = false;
  const selectedOut = $('out').value.trim();
  $('btnFolder').disabled = !selectedOut;
  renderFileRows(artefacts, selectedOut);
  $('btnStart').title = running
    ? 'Một việc đang chạy. Dừng trước khi bắt đầu job khác.'
    : 'lấy danh sách rồi quét affiliate trên từng website';
  $('btnCollectList').title = running
    ? 'Một việc đang chạy. Dừng trước khi bắt đầu job khác.'
    : 'chỉ danh sách Trustpilot, ghi companies.csv';
  $('btnResume').title = running
    ? 'Một việc đang quét. Dừng trước khi tiếp tục job khác.'
    : '';
  $('btnStop').title =
    running && s.outDir && !pathMatch ? `Dừng việc đang quét: ${folderName(s.outDir)}` : '';

  const note = $('liveJobNote');
  if (note) {
    const away = Boolean(running && s.outDir && !pathMatch);
    note.hidden = !away;
    if (away) {
      const nameEl = $('liveJobName');
      if (nameEl) nameEl.textContent = folderName(s.outDir);
    }
  }

  renderJobTable();
}

async function syncFromOutDir({ force = false } = {}) {
  const out = $('out').value.trim();
  if (!out || !api?.inspectOutDir) return;
  const draft = $('query').value.trim();
  try {
    const info = await api.inspectOutDir(out);
    if (info?.query && (force || !draft || info.canResume)) {
      setQueryInput(info.query);
    }
    const requested = info?.progress?.requestedLimit;
    if (typeof requested === 'number' && requested > 0 && !$('limit').matches(':focus')) {
      $('limit').value = String(requested);
    }
  } catch {
    /* giữ từ khoá người dùng */
  }
}

async function applyOutPath(path) {
  if (!path) return;
  setOutPath(path);
  await refreshRunPicker(path);
  await syncFromOutDir({ force: true });
  const name = folderName(path);
  $('previewTitle').textContent = name;
  if (lastStatus) renderStatus(lastStatus);
  else if (api?.getStatus) renderStatus(await api.getStatus());
}

async function boot() {
  if (!api) {
    $('message').textContent = 'Bridge Electron chưa sẵn sàng (mở qua npm run desktop:dev).';
    return;
  }

  setQueryInput(loadLastQuery());
  const defaults = await api.getDefaults();
  if (defaults?.versions?.app) {
    const chip = $('btnVersion');
    if (chip) chip.textContent = `v${defaults.versions.app}`;
  }
  if (defaults?.out) {
    setOutPath(defaults.out);
    await syncFromOutDir({ force: true });
    if (!$('query').value.trim()) setQueryInput(loadLastQuery());
  }
  await refreshRunPicker($('out').value.trim());

  api.onStatus((s) => {
    renderStatus(s);
    if (s.state === 'idle') {
      const currentOut = $('out').value.trim();
      const browsedAway = Boolean(s.outDir && currentOut && currentOut !== s.outDir);
      void refreshRunPicker(browsedAway ? currentOut : s.outDir || currentOut, {
        forceSelect: !browsedAway,
      });
    }
  });
  renderStatus(await api.getStatus());

  $('btnPickOut').onclick = async () => {
    try {
      const picked = await api.pickOutDir();
      if (picked?.canceled || !picked?.path) return;
      await applyOutPath(picked.path);
    } catch (e) {
      $('message').textContent = friendlyError(e);
      $('message').classList.add('is-error');
    }
  };

  $('btnNewOut').onclick = async () => {
    try {
      const created = await api.newOutDir();
      if (created?.path) await applyOutPath(created.path);
    } catch (e) {
      $('message').textContent = friendlyError(e);
      $('message').classList.add('is-error');
    }
  };

  $('runPicker').onchange = async () => {
    const path = $('runPicker').value;
    if (path) await applyOutPath(path);
  };

  $('btnOpenRunsRoot').onclick = () => api.openRunsRoot?.();

  $('jobFilter').addEventListener('input', () => renderJobTable());

  function scanOptFlags() {
    return {
      earlyExit: Boolean($('earlyExit')?.checked),
      networkEvidence: Boolean($('networkEvidence')?.checked),
      lazySettle: Boolean($('lazySettle')?.checked),
      probeParallel: Boolean($('probeParallel')?.checked),
      concurrency: $('concurrencyRow')?.checked ? 3 : 2,
      virtualDisplay: $('hideChrome')?.checked !== false,
    };
  }

  function lockLaunchControls() {
    $('btnStart').disabled = true;
    $('btnCollectList').disabled = true;
    $('btnResume').disabled = true;
  }

  function unlockLaunchControlsIfIdle() {
    if (lastStatus && (lastStatus.state === 'running' || lastStatus.state === 'stopping')) return;
    $('btnStart').disabled = false;
    $('btnCollectList').disabled = false;
    $('btnResume').disabled = false;
  }

  async function startFreshJob(extra) {
    lockLaunchControls();
    await syncFromOutDir();
    const query = $('query').value.trim();
    if (!query) {
      $('message').textContent = 'Nhập từ khoá Trustpilot trước khi lấy danh sách.';
      $('message').classList.add('is-error');
      $('query').classList.add('is-error');
      $('query').focus({ preventScroll: true });
      unlockLaunchControlsIfIdle();
      return;
    }
    saveLastQuery(query);
    try {
      const outForStart = $('out').value.trim();
      await api.startJob({
        query,
        limit: parseLimitInput($('limit').value),
        out: outForStart,
        resume: false,
        ...extra,
        ...scanOptFlags(),
      });
    } catch (e) {
      $('message').textContent = friendlyError(e);
      $('message').classList.add('is-error');
      unlockLaunchControlsIfIdle();
    }
  }

  $('btnStart').onclick = () => startFreshJob({});
  $('btnCollectList').onclick = () => startFreshJob({ collectOnly: true });

  $('btnResume').onclick = async () => {
    lockLaunchControls();
    try {
      await syncFromOutDir({ force: true });
      const outForResume = $('out').value.trim();
      await api.startJob({ out: outForResume, resume: true, ...scanOptFlags() });
    } catch (e) {
      $('message').textContent = friendlyError(e);
      $('message').classList.add('is-error');
      unlockLaunchControlsIfIdle();
    }
  };

  $('btnStop').onclick = async () => {
    try {
      await api.stopJob();
    } catch (e) {
      $('message').textContent = friendlyError(e);
      $('message').classList.add('is-error');
    }
  };
  $('btnFolder').onclick = async () => {
    try {
      const opened = await api.openOutDir($('out').value.trim());
      if (opened && opened.ok === false) {
        $('message').textContent = 'Chưa có thư mục job để mở.';
        $('message').classList.add('is-error');
      }
    } catch (e) {
      $('message').textContent = friendlyError(e);
      $('message').classList.add('is-error');
    }
  };
  function fillSettings() {
    const v = defaults?.versions || {};
    const dl = $('versionList');
    if (dl) {
      dl.replaceChildren();
      const rows = [
        ['Ứng dụng', v.app ? `v${v.app}` : '—'],
        ['Bộ dò', v.detector || '—'],
        ['Electron', v.electron || '—'],
        ['Chrome (app)', v.chrome || '—'],
        ['Node', v.node || '—'],
      ];
      for (const [k, val] of rows) {
        const dt = document.createElement('dt');
        dt.textContent = k;
        const dd = document.createElement('dd');
        dd.textContent = val;
        dl.append(dt, dd);
      }
    }
    const notes = $('versionNotes');
    if (notes) {
      notes.replaceChildren();
      for (const item of defaults?.versionNotes || []) {
        const li = document.createElement('li');
        const ver = document.createElement('strong');
        ver.textContent = `v${item.version}`;
        li.append(ver, document.createTextNode(` — ${item.note}`));
        notes.appendChild(li);
      }
    }
    const run = selectedRun();
    const out = $('out').value.trim();
    const statusEl = $('settingsJobStatus');
    const filesEl = $('settingsJobFiles');
    if (statusEl) {
      if (!out) statusEl.textContent = 'Chưa chọn job.';
      else {
        const bits = [folderName(out)];
        if (run?.query) bits.push(`từ khoá ${run.query}`);
        if (run?.total) bits.push(`${run.completed}/${run.total} website`);
        statusEl.textContent = bits.join(' · ');
      }
    }
    if (filesEl) {
      filesEl.replaceChildren();
      const files = run?.artefacts || lastStatus?.artefacts || [];
      if (!files.length) {
        const li = document.createElement('li');
        li.textContent = 'Chưa có CSV. Chạy Lấy danh sách để có companies.csv.';
        filesEl.appendChild(li);
      } else {
        for (const file of files) {
          const li = document.createElement('li');
          li.textContent = file;
          filesEl.appendChild(li);
        }
      }
    }
  }

  function openSettings() {
    fillSettings();
    $('settingsDialog')?.showModal();
  }

  $('btnSettings')?.addEventListener('click', openSettings);
  $('btnVersion')?.addEventListener('click', openSettings);
}

boot();
