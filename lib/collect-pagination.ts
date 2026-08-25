/** Collect pagination decisions — chrome-free so CLI, desktop, and tests share them. */

export const MIN_COLLECT_LIMIT = 1;
export const MAX_COLLECT_LIMIT = 10_000;
export const MAX_AUTO_COLLECT_PAGES = 1_000;
export const MIN_AUTO_COLLECT_PAGES = 40;
/** Live design collect ~8–10 unique / ~10 raw per page. Below this, "last page" is plausible. */
export const FULL_SEARCH_PAGE_UNITS = 8;
export const COLLECT_WAF_PAGE_RETRIES = 3;

export type CollectStopReason =
  | 'continue'
  | 'limit'
  | 'last-page'
  | 'empty'
  | 'retry-waf'
  | 'challenge-stop'
  | 'max-pages';

/** Parse the GUI/CLI limit. Vietnamese 10.000 / 10,000 → 10000, not JS 10. */
export function parseLimitInput(raw: unknown): number {
  const s = String(raw ?? '').trim();
  if (!s) return 20;
  const grouped = /^\d{1,2}[.,]\d{3}$/.test(s) ? s.replace(/[.,]/g, '') : s.replace(/,/g, '');
  const n = Number(grouped);
  return clampCollectLimit(n);
}

export function clampCollectLimit(n: number | undefined): number {
  if (!Number.isFinite(n)) return 20;
  return Math.min(MAX_COLLECT_LIMIT, Math.max(MIN_COLLECT_LIMIT, Math.trunc(n as number)));
}

export function maxPagesForLimit(limit: number): number {
  const n = clampCollectLimit(limit);
  return Math.min(MAX_AUTO_COLLECT_PAGES, Math.max(MIN_AUTO_COLLECT_PAGES, Math.ceil(n / 10)));
}

export function nextCollectAction(input: {
  rawOnPage: number;
  collected: number;
  limit: number;
  pageNum: number;
  maxPages: number;
  currentPage: number | null;
  totalPages: number | null;
  challenged: boolean;
  wafRetries: number;
}): CollectStopReason {
  if (input.collected >= input.limit) return 'limit';
  if (input.rawOnPage <= 0) {
    if (input.challenged && input.wafRetries < COLLECT_WAF_PAGE_RETRIES) return 'retry-waf';
    if (input.challenged) return 'challenge-stop';
    return 'empty';
  }
  // Trustpilot totalPages is often far below real walkable pages (hasMore was worse).
  // Only honor it when this page looks like a tail (few units).
  if (
    input.rawOnPage < FULL_SEARCH_PAGE_UNITS &&
    input.currentPage != null &&
    input.totalPages != null &&
    input.currentPage >= input.totalPages
  ) {
    return 'last-page';
  }
  if (input.pageNum >= input.maxPages) return 'max-pages';
  return 'continue';
}
