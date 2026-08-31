// Shared Trustpilot search-page reader — chrome-free so both
// chrome.scripting.executeScript and Playwright page.evaluate can inject it.
// Self-contained body (no outer-module refs at runtime).

/** Minimal, serializable shape returned by the injected reader.
 * NOTE: Trustpilot's pageProps.hasMore is unreliable — page by `pagination`. */
export interface SearchReadResult {
  challenged: boolean;
  currentPage: number | null;
  totalPages: number | null;
  units: Array<{ name: string; domain: string; trustScore: number | null; reviews: number | null }>;
}

/**
 * Injected into the loaded Trustpilot search page. Self-contained (no module
 * refs) — reads __NEXT_DATA__ and maps businessUnits to minimal records.
 */
export function readTrustpilotSearch(): SearchReadResult {
  const title = (document.title || '').toLowerCase();
  // A genuine search result page ALWAYS carries __NEXT_DATA__ (verified live);
  // its absence means we are on an interstitial (AWS WAF / CF / consent) —
  // flag challenged regardless of title so callers retry instead of silently
  // reading "zero companies".
  const el = document.getElementById('__NEXT_DATA__');
  const hasNextData = Boolean(el && el.textContent);
  const challenged =
    !hasNextData ||
    [
      'just a moment',
      'verifying',
      'attention required',
      'checking your browser',
      'access denied',
      'captcha',
      'verification',
    ].some((s) => title.includes(s));
  if (!hasNextData || !el?.textContent) return { challenged, currentPage: null, totalPages: null, units: [] };
  try {
    const data = JSON.parse(el.textContent) as {
      props?: {
        pageProps?: {
          pagination?: { currentPage?: number; totalPages?: number };
          businessUnits?: unknown;
        };
      };
    };
    const pp = data?.props?.pageProps;
    const pag = pp?.pagination;
    const currentPage = typeof pag?.currentPage === 'number' ? pag.currentPage : null;
    const totalPages = typeof pag?.totalPages === 'number' ? pag.totalPages : null;
    let units: unknown = pp?.businessUnits;
    if (units && !Array.isArray(units) && typeof units === 'object' && Array.isArray((units as { businessUnits?: unknown }).businessUnits)) {
      units = (units as { businessUnits: unknown[] }).businessUnits;
    }
    if (!Array.isArray(units)) return { challenged, currentPage, totalPages, units: [] };
    const mapped = units.map((raw: unknown) => {
      const u = raw as {
        displayName?: string;
        identifyingName?: string;
        trustScore?: number | { stars?: number };
        numberOfReviews?: number | { total?: number };
      };
      return {
        name: u?.displayName || u?.identifyingName || '',
        domain: u?.identifyingName || '',
        trustScore:
          typeof u?.trustScore === 'number'
            ? u.trustScore
            : typeof u?.trustScore?.stars === 'number'
              ? u.trustScore.stars
              : null,
        reviews:
          typeof u?.numberOfReviews === 'number'
            ? u.numberOfReviews
            : typeof u?.numberOfReviews?.total === 'number'
              ? u.numberOfReviews.total
              : null,
      };
    });
    return { challenged, currentPage, totalPages, units: mapped };
  } catch {
    return { challenged, currentPage: null, totalPages: null, units: [] };
  }
}
