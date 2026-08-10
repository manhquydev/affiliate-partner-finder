// Collect (docs/08 Bước 1) — via a REAL Trustpilot tab, not a raw fetch.
//
// Why a tab: a background/extension-page fetch to trustpilot.com gets a
// Cloudflare 403 "verifying your connection" challenge after the first page
// (confirmed: server-side fetch returns 403), which made collection stall at
// ~10 companies. Loading /search in an actual tab uses the user's real browser
// session (cookies + JS run) so Cloudflare passes — exactly the trick used for
// scanning target sites. We read __NEXT_DATA__ from the loaded page, then page
// forward by navigating the same tab (?page=N).
//
// De-dup by `skip` (domains already known) makes repeat runs page forward and
// return only NEW companies.

import { sleep, waitForComplete, closeTab } from './tab-utils';
import { readTrustpilotSearch, type SearchReadResult } from './trustpilot-reader';
import type { Company } from './types';

const SEARCH_BASE = 'https://www.trustpilot.com/search';
const REVIEW_BASE = 'https://www.trustpilot.com/review';

/** Read the current tab's search results, retrying while Cloudflare verifies. */
async function readPage(tabId: number): Promise<SearchReadResult | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    await sleep(attempt === 0 ? 900 : 2500);
    const [wrap] = await chrome.scripting.executeScript({ target: { tabId }, func: readTrustpilotSearch });
    const res = wrap?.result as SearchReadResult | undefined;
    if (!res) return null;
    if (res.units.length > 0) return res;
    if (res.challenged) continue; // still on the Cloudflare interstitial — wait more
    return res; // loaded, genuinely empty
  }
  return null;
}

/**
 * Collect up to `limit` NEW companies (not in `skip`) for a query, via a real
 * Trustpilot tab, paging forward until enough new are found or pages run out.
 */
export async function collect(
  query: string,
  limit: number,
  skip: Set<string> = new Set(),
  delayMs = 1500,
  maxPages = 40,
): Promise<Company[]> {
  const out: Company[] = [];
  const seen = new Set<string>();
  let tabId: number | undefined;

  try {
    for (let page = 1; page <= maxPages && out.length < limit; page++) {
      const url = `${SEARCH_BASE}?query=${encodeURIComponent(query)}&page=${page}`;
      if (tabId === undefined) {
        const tab = await chrome.tabs.create({ url, active: false });
        tabId = tab.id;
      } else {
        await chrome.tabs.update(tabId, { url });
        await sleep(500); // let the navigation flip status to 'loading' first
      }
      if (tabId === undefined) break;

      await waitForComplete(tabId, 25000);
      const res = await readPage(tabId);

      if (!res || res.units.length === 0) {
        if (out.length > 0) break; // keep what we have
        if (res?.challenged) {
          throw new Error(
            'Trustpilot đang kiểm tra trình duyệt (Cloudflare). Mở trustpilot.com/search một lần trong tab để qua kiểm tra, rồi thử lại — không bypass.',
          );
        }
        break;
      }

      for (const u of res.units) {
        const domain = (u.domain || '').trim();
        if (!domain) continue;
        if (skip.has(domain) || seen.has(domain)) continue; // already known → page past it
        seen.add(domain);
        out.push({
          name: u.name || domain,
          domain,
          trustScore: typeof u.trustScore === 'number' ? u.trustScore : null,
          reviews: typeof u.reviews === 'number' ? u.reviews : null,
          trustpilotUrl: `${REVIEW_BASE}/${domain}`,
        });
        if (out.length >= limit) break;
      }

      // Stop when we've reached the last page (Trustpilot's hasMore is unreliable
      // — use pagination.currentPage/totalPages). Empty pages already break above.
      if (res.currentPage != null && res.totalPages != null && res.currentPage >= res.totalPages) break;
      if (out.length < limit) await sleep(delayMs);
    }
  } finally {
    await closeTab(tabId);
  }

  return out.slice(0, limit);
}
