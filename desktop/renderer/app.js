/** Renderer — talks to preload bridge only. */

const api = window.affiliateDesktop;

function $(id) {
  return document.getElementById(id);
}

function renderStatus(s) {
  if (!s) return;
  $('state').textContent = `Trạng thái: ${s.state}`;
  const p = s.progress;
  $('progress').textContent = p
    ? `Tiến độ: ${p.completed} / ${p.total}`
    : 'Tiến độ: —';
  $('current').textContent = s.currentDomains?.length
    ? `Đang xử lý: ${s.currentDomains.join(', ')}`
    : 'Đang xử lý: —';
  const c = s.counts || { true: 0, false: 0, unknown: 0 };
  $('counts').textContent = `Kết quả: true ${c.true} · false ${c.false} · unknown ${c.unknown}`;
  $('message').textContent = s.message || '';
  const running = s.state === 'running' || s.state === 'stopping';
  $('btnStart').disabled = running;
  $('btnResume').disabled = running;
  $('btnStop').disabled = !running;
}

async function boot() {
  if (!api) {
    $('message').textContent = 'Bridge Electron chưa sẵn sàng (mở qua npm run desktop:dev).';
    return;
  }
  const defaults = await api.getDefaults();
  if (defaults?.out) $('out').value = defaults.out;
  api.onStatus(renderStatus);
  renderStatus(await api.getStatus());

  $('btnStart').onclick = async () => {
    try {
      await api.startJob({
        query: $('query').value,
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
