// Trustpilot collect via Playwright persistent/headed context.

import type { BrowserContext, Page } from 'playwright';
import { readTrustpilotSearch, type SearchReadResult } from '../lib/trustpilot-reader';
import type { Company } from '../lib/types';

const SEARCH_BASE = 'https://www.trustpilot.com/search';
const REVIEW_BASE = 'https://www.trustpilot.com/review';

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function readPage(page: Page): Promise<SearchReadResult | null> {
  let sawChallenge = false;
  for (let attempt = 0; attempt < 4; attempt++) {
    await sleep(attempt === 0 ? 900 : 2500);
    const res = await page.evaluate(readTrustpilotSearch);
    if (!res) continue;
    if (res.challenged) sawChallenge = true;
    if (res.units.length > 0) return res;
    if (res.challenged) continue;
    return res;
  }
  // Prolonged CF / failed inject: surface as challenged empty so caller throws.
  if (sawChallenge) {
    return { challenged: true, currentPage: null, totalPages: null, units: [] };
  }
  return null;
}

async function gotoWithRetry(page: Page, url: string, attempts = 4): Promise<void> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      return;
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[cli] collect goto retry ${i + 1}/${attempts}: ${msg.slice(0, 160)}`);
      await sleep(1500 * (i + 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export type CollectCliOptions = {
  /** Called after each successful page with the cumulative company list (for checkpoint). */
  onProgress?: (companies: Company[], pageNum: number, totalPagesHint: number | null) => void;
  /** When true, abort pagination and return partial results (soft stop). */
  shouldStop?: () => boolean;
};

/**
 * Collect up to `limit` NEW companies (not in `skip`).
 * On Cloudflare after retries with zero companies collected → throws (never empty success).
 */
export async function collectCli(
  context: BrowserContext,
  query: string,
  limit: number,
  skip: Set<string> = new Set(),
  delayMs = 1500,
  maxPages = 40,
  opts: CollectCliOptions = {},
): Promise<Company[]> {
  const out: Company[] = [];
  const seen = new Set<string>();
  const page = await context.newPage();
  let lastChallenged = false;
  let totalPagesHint: number | null = null;

  try {
    for (let pageNum = 1; pageNum <= maxPages && out.length < limit; pageNum++) {
      if (opts.shouldStop?.()) {
        console.log('[cli] collect stop requested — returning partial checkpoint');
        break;
      }
      const url = `${SEARCH_BASE}?query=${encodeURIComponent(query)}&page=${pageNum}`;
      console.log(`[cli] collect page ${pageNum}/${maxPages} collected=${out.length}/${limit}`);
      await gotoWithRetry(page, url);
      const res = await readPage(page);
      lastChallenged = Boolean(res?.challenged);
      if (res?.totalPages != null) totalPagesHint = res.totalPages;

      if (!res || res.units.length === 0) {
        if (out.length > 0) break;
        if (res?.challenged || lastChallenged) {
          throw new Error(
            'Trustpilot Cloudflare challenge. Open trustpilot.com/search once in the persistent Chrome profile, pass the check, then re-run. No CAPTCHA bypass.',
          );
        }
        break;
      }

      for (const u of res.units) {
        const domain = (u.domain || '').trim();
        if (!domain) continue;
        if (skip.has(domain) || seen.has(domain)) continue;
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

      opts.onProgress?.(out.slice(), pageNum, totalPagesHint);

      if (res.currentPage != null && res.totalPages != null && res.currentPage >= res.totalPages) break;
      if (out.length < limit) {
        if (opts.shouldStop?.()) {
          console.log('[cli] collect stop requested — returning partial checkpoint');
          break;
        }
        await sleep(delayMs);
      }
    }
  } finally {
    await page.close().catch(() => undefined);
  }

  if (out.length === 0 && lastChallenged) {
    throw new Error(
      'Trustpilot Cloudflare challenge with zero companies. Pass the check in the profile browser, then re-run.',
    );
  }

  return out.slice(0, limit);
}
