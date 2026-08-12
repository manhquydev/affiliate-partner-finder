/** Renderer — talks to preload bridge only. */

const STORAGE_KEY = 'apf-last-query';

const api = window.affiliateDesktop;

function $(id) {
  return document.getElementById(id);
}

function saveLastQuery(q) {
  try {
    const trimmed = String(q || '').trim();
    if (trimmed) localStorage.setItem(STORAGE_KEY, trimmed);
  } catch {
    /* private mode / quota */
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
  el.disabled = false;
  el.setAttribute('aria-readonly', readonly ? 'true' : 'false');
}

function renderStatus(s) {
  if (!s) return;
  const running = s.state === 'running' || s.state === 'stopping';
  $('state').textContent = `Trạng thái: ${s.state}`;
  const p = s.progress;
  $('progress').textContent = p
    ? `Tiến độ: ${p.completed} / ${p.total}`
    : 'Tiến độ: —';
  const jobQuery = p?.query?.trim();
  $('jobQuery').textContent = jobQuery
    ? `Từ khoá job: ${jobQuery}`
    : 'Từ khoá job: —';
  if (jobQuery && running) setQueryInput(jobQuery, { readonly: true });
  else if (!running) {
    setQueryInput($('query').value, { readonly: false });
    if (jobQuery && !$('query').value.trim()) $('query').value = jobQuery;
  }
  $('current').textContent = s.currentDomains?.length
    ? `Đang xử lý: ${s.currentDomains.join(', ')}`
    : 'Đang xử lý: —';
  const c = s.counts || { true: 0, false: 0, unknown: 0 };
  $('counts').textContent = `Kết quả: true ${c.true} · false ${c.false} · unknown ${c.unknown}`;
  $('message').textContent = s.message || '';
  $('btnStart').disabled = running;
  $('btnResume').disabled = running;
  $('btnStop').disabled = !running;
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
    /* out chưa tồn tại hoặc chưa có progress — giữ từ khoá người dùng nhập */
  }
}

async function boot() {
  if (!api) {
    $('message').textContent = 'Bridge Electron chưa sẵn sàng (mở qua npm run desktop:dev).';
    return;
  }
  setQueryInput(loadLastQuery());
  const defaults = await api.getDefaults();
  if (defaults?.out) {
    $('out').value = defaults.out;
    await syncFromOutDir({ force: true });
    if (!$('query').value.trim()) setQueryInput(loadLastQuery());
  }
  api.onStatus(renderStatus);
  renderStatus(await api.getStatus());

  $('out').addEventListener('change', () => void syncFromOutDir());

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
      });
    } catch (e) {
      $('message').textContent = e?.message || String(e);
    }
  };
  $('btnResume').onclick = async () => {
    try {
      await syncFromOutDir({ force: true });
      await api.startJob({ out: $('out').value, resume: true });
    } catch (e) {
      $('message').textContent = e?.message || String(e);
    }
  };
  $('btnStop').onclick = () => api.stopJob();
  $('btnFolder').onclick = () => api.openOutDir();
  $('btnCsv').onclick = () => api.openCsv();
}

boot();
