// Collect (docs/08 Bước 1): fetch Trustpilot /search?query=&page=N from the
// background worker (host_permissions covers *.trustpilot.com), parse
// __NEXT_DATA__, and map businessUnits[] to Company records.
//
// Ethics: gentle delay between pages, retry a challenge once, never bypass.

import type { Company } from './types';
import { extractNextData, looksLikeChallenge } from './next-data';

const SEARCH_BASE = 'https://www.trustpilot.com/search';
const REVIEW_BASE = 'https://www.trustpilot.com/review';

interface BusinessUnit {
  displayName?: string;
  identifyingName?: string; // = domain
  trustScore?: number;
  numberOfReviews?: number;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Pull businessUnits[] out of a parsed __NEXT_DATA__ object, defensively. */
function readBusinessUnits(data: unknown): BusinessUnit[] {
  const units = (data as any)?.props?.pageProps?.businessUnits;
  return Array.isArray(units) ? (units as BusinessUnit[]) : [];
}

function readHasMore(data: unknown): boolean {
  const hasMore = (data as any)?.props?.pageProps?.hasMore;
  // If Trustpilot omits the flag, assume more pages may exist and let `limit` stop us.
  return hasMore !== false;
}

function toCompany(bu: BusinessUnit): Company | null {
  const domain = bu.identifyingName?.trim();
  if (!domain) return null;
  return {
    name: bu.displayName?.trim() || domain,
    domain,
    trustScore: typeof bu.trustScore === 'number' ? bu.trustScore : null,
    reviews: typeof bu.numberOfReviews === 'number' ? bu.numberOfReviews : null,
    trustpilotUrl: `${REVIEW_BASE}/${domain}`,
  };
}

/** Fetch one search page's HTML; retry once if a challenge page comes back. */
async function fetchSearchPage(query: string, page: number): Promise<string> {
  const url = `${SEARCH_BASE}?query=${encodeURIComponent(query)}&page=${page}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, { headers: { accept: 'text/html' } });
    const html = await res.text();
    if (looksLikeChallenge(html) && attempt === 0) {
      await sleep(2500); // give the browser session a moment; do NOT bypass
      continue;
    }
    return html;
  }
  return '';
}

/**
 * Collect up to `limit` companies for a query, paginating gently.
 * @returns deduped Company[] (by domain).
 */
export async function collect(
  query: string,
  limit: number,
  delayMs = 1500,
  maxPages = 10,
): Promise<Company[]> {
  const out: Company[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= maxPages && out.length < limit; page++) {
    const html = await fetchSearchPage(query, page);
    if (!html) break;
    const data = extractNextData(html);
    if (!data) {
      // A challenge on the FIRST page means we got nothing — surface it. On a
      // later page, keep the companies already collected rather than discarding.
      if (looksLikeChallenge(html)) {
        if (out.length > 0) break;
        throw new Error('Trustpilot bot-check active — try again shortly (not bypassed).');
      }
      break;
    }
    const units = readBusinessUnits(data);
    if (units.length === 0) break;

    for (const bu of units) {
      const c = toCompany(bu);
      if (c && !seen.has(c.domain)) {
        seen.add(c.domain);
        out.push(c);
        if (out.length >= limit) break;
      }
    }

    if (!readHasMore(data)) break;
    if (out.length < limit) await sleep(delayMs);
  }

  return out.slice(0, limit);
}
