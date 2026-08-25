/** Renderer — preload bridge + dashboard UX. */

const STORAGE_KEY = 'apf-last-query';

const api = window.affiliateDesktop;

const STATE_LABELS = {
  idle: 'Chờ',
  running: 'Đang chạy',
  stopping: 'Đang dừng…',
  error: 'Lỗi',
};

function $(id) {
  return document.getElementById(id);
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

function pct(completed, total) {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.round((100 * completed) / total));
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

async function refreshRunPicker(selectPath) {
  if (!api?.listRuns) return;
  const { runs } = await api.listRuns();
  const sel = $('runPicker');
  const current = selectPath || $('out').value.trim();
  sel.innerHTML = '<option value="">— Chọn job để tiếp tục —</option>';
  for (const run of runs) {
    const opt = document.createElement('option');
    opt.value = run.path;
    opt.textContent = formatRunOption(run);
    if (run.path === current) opt.selected = true;
    sel.appendChild(opt);
  }
}

function renderStatus(s) {
  if (!s) return;
  const running = s.state === 'running' || s.state === 'stopping';
  const p = s.progress;
  const completed = p?.completed ?? 0;
  const total = p?.total ?? 0;
  const percent = pct(completed, total);

  const badge = $('stateBadge');
  badge.textContent = STATE_LABELS[s.state] || s.state;
  badge.dataset.state = s.state;
  $('dashboard').dataset.running = running ? 'true' : 'false';

  $('progressPct').textContent = `${percent}%`;
  $('progressFraction').textContent =
    total > 0 ? `${completed} / ${total} công ty` : '0 / 0 công ty';
  $('progressFill').style.width = `${percent}%`;
  const track = $('progressTrack');
  track.setAttribute('aria-valuenow', String(percent));
  track.setAttribute('aria-valuetext', `${completed} trên ${total} công ty`);

  if (running && total > 0) {
    $('progressHint').textContent =
      percent >= 100 ? 'Đang hoàn tất và ghi CSV…' : `Đang quét — còn ${total - completed} công ty`;
  } else if (p && completed > 0) {
    $('progressHint').textContent = `Đã xử lý ${completed} công ty — có thể Tiếp tục hoặc mở CSV.`;
  } else {
    $('progressHint').textContent = 'Sẵn sàng bắt đầu quét mới hoặc tiếp tục job cũ.';
  }

  renderEta(s.eta, { running, completed, total });

  const jobQuery = p?.query?.trim();
  $('jobQuery').textContent = jobQuery ? `Từ khoá job: ${jobQuery}` : 'Từ khoá job: —';

  if (jobQuery && running) setQueryInput(jobQuery, { readonly: true });
  else if (!running) {
    setQueryInput($('query').value, { readonly: false });
    if (jobQuery && !$('query').value.trim()) $('query').value = jobQuery;
  }

  const c = s.counts || { true: 0, false: 0, unknown: 0 };
  $('statTrue').textContent = String(c.true);
  $('statFalse').textContent = String(c.false);
  $('statUnknown').textContent = String(c.unknown);

  const domains = s.currentDomains?.length ? s.currentDomains : [];
  $('current').textContent = domains.length ? domains.join(', ') : '—';
  $('current').classList.toggle('is-active', domains.length > 0);

  $('message').textContent = s.message || '';
  $('btnStart').disabled = running;
  $('btnResume').disabled = running;
  $('btnStop').disabled = !running;
  $('btnPickOut').disabled = running;
  $('btnNewOut').disabled = running;
  $('runPicker').disabled = running;

  if (s.outDir && !running) {
    setOutPath(s.outDir);
  }
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
  } catch {
    /* giữ từ khoá người dùng */
  }
}

async function applyOutPath(path) {
  if (!path) return;
  setOutPath(path);
  await refreshRunPicker(path);
  await syncFromOutDir({ force: true });
}

async function boot() {
  if (!api) {
    $('message').textContent = 'Bridge Electron chưa sẵn sàng (mở qua npm run desktop:dev).';
    return;
  }

  setQueryInput(loadLastQuery());
  const defaults = await api.getDefaults();
  if (defaults?.out) {
    setOutPath(defaults.out);
    await syncFromOutDir({ force: true });
    if (!$('query').value.trim()) setQueryInput(loadLastQuery());
  }
  await refreshRunPicker($('out').value.trim());

  api.onStatus((s) => {
    renderStatus(s);
    if (s.state === 'idle') void refreshRunPicker(s.outDir || $('out').value.trim());
  });
  renderStatus(await api.getStatus());

  $('btnPickOut').onclick = async () => {
    try {
      const picked = await api.pickOutDir();
      if (picked?.canceled || !picked?.path) return;
      await applyOutPath(picked.path);
    } catch (e) {
      $('message').textContent = e?.message || String(e);
    }
  };

  $('btnNewOut').onclick = async () => {
    try {
      const created = await api.newOutDir();
      if (created?.path) await applyOutPath(created.path);
    } catch (e) {
      $('message').textContent = e?.message || String(e);
    }
  };

  $('runPicker').onchange = async () => {
    const path = $('runPicker').value;
    if (path) await applyOutPath(path);
  };

  $('btnOpenRunsRoot').onclick = () => api.openRunsRoot?.();

  function scanOptFlags() {
    return {
      earlyExit: Boolean($('earlyExit')?.checked),
      networkEvidence: Boolean($('networkEvidence')?.checked),
      lazySettle: Boolean($('lazySettle')?.checked),
      // "Tăng tốc" = 3 sites in parallel, otherwise the safe default of 2.
      concurrency: $('concurrencyRow')?.checked ? 3 : 2,
      virtualDisplay: $('hideChrome')?.checked !== false,
    };
  }

  $('btnStart').onclick = async () => {
    await syncFromOutDir();
    const query = $('query').value.trim();
    if (!query) {
      $('message').textContent = 'Nhập từ khoá Trustpilot trước khi bắt đầu.';
      $('query').focus();
      return;
    }
    saveLastQuery(query);
    try {
      await api.startJob({
        query,
        limit: Number($('limit').value),
        out: $('out').value,
        resume: false,
        ...scanOptFlags(),
      });
    } catch (e) {
      $('message').textContent = e?.message || String(e);
    }
  };

  $('btnResume').onclick = async () => {
    try {
      await syncFromOutDir({ force: true });
      await api.startJob({ out: $('out').value, resume: true, ...scanOptFlags() });
    } catch (e) {
      $('message').textContent = e?.message || String(e);
    }
  };

  $('btnStop').onclick = () => api.stopJob();
  $('btnFolder').onclick = () => api.openOutDir();
  $('btnCsv').onclick = () => api.openCsv();
}

boot();
