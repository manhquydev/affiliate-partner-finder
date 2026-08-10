// Shared tab helpers used by both the scanner (lib/scan.ts) and the collector
// (lib/collect.ts). Kept in one place (DRY).

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Resolve 'ok' when the tab finishes loading, or 'timeout' after timeoutMs. */
export function waitForComplete(tabId: number, timeoutMs: number): Promise<'ok' | 'timeout'> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (v: 'ok' | 'timeout') => {
      if (settled) return;
      settled = true;
      chrome.tabs.onUpdated.removeListener(listener);
      clearTimeout(timer);
      resolve(v);
    };
    const timer = setTimeout(() => finish('timeout'), timeoutMs);
    function listener(id: number, info: chrome.tabs.TabChangeInfo) {
      if (id === tabId && info.status === 'complete') finish('ok');
    }
    chrome.tabs.onUpdated.addListener(listener);
    // The tab may already be 'complete' before the listener attached.
    chrome.tabs
      .get(tabId)
      .then((t) => {
        if (t.status === 'complete') finish('ok');
      })
      .catch(() => {});
  });
}

export async function closeTab(tabId?: number): Promise<void> {
  if (tabId === undefined) return;
  try {
    await chrome.tabs.remove(tabId);
  } catch {
    /* tab already gone */
  }
}
