// Resolve (docs/08 Bước 2): turn a Trustpilot domain into a clean website URL.
// Preferred: parse the review page's __NEXT_DATA__ businessUnit.websiteUrl.
// Cheap fallback (default): use https://{domain} directly — good for most cases.

import { extractNextData } from './next-data.ts';

const REVIEW_BASE = 'https://www.trustpilot.com/review';

/** Read businessUnit.websiteUrl from a parsed review-page __NEXT_DATA__. */
function readWebsiteUrl(data: unknown): string | null {
  const url = (data as any)?.props?.pageProps?.businessUnit?.websiteUrl;
  return typeof url === 'string' && url.length > 0 ? url : null;
}

/** Normalize a bare domain to an https URL. */
export function domainToUrl(domain: string): string {
  return /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
}

/**
 * Resolve a website URL for a company domain.
 * @param viaReviewPage when true, fetch the review page for the exact URL;
 *   otherwise (default) just use https://{domain}.
 */
export async function resolve(
  domain: string,
  viaReviewPage = false,
): Promise<string> {
  if (viaReviewPage) {
    // Bound the fetch: an untimed fetch can hang the run loop (and, in a service
    // worker, a >30s response is a documented hard-kill). 12s is plenty.
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 12000);
    try {
      const res = await fetch(`${REVIEW_BASE}/${domain}`, {
        headers: { accept: 'text/html' },
        signal: ac.signal,
      });
      const html = await res.text();
      const data = extractNextData(html);
      const url = data ? readWebsiteUrl(data) : null;
      if (url) return url;
    } catch {
      // timeout / network error → fall through to the cheap fallback
    } finally {
      clearTimeout(timer);
    }
  }
  return domainToUrl(domain);
}
