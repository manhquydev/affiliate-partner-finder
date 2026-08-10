// Trustpilot pages are Next.js and embed a <script id="__NEXT_DATA__"> JSON blob
// with the full structured data (docs/03 A3). Parsing this is far more robust
// than scraping the DOM. Shared by collect (search) and resolve (review page).

/** Extract and parse the __NEXT_DATA__ JSON from a Trustpilot HTML document. */
export function extractNextData(html: string): unknown | null {
  const m = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
  );
  if (!m || !m[1]) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

/** True if the fetched HTML is Cloudflare/Trustpilot's bot challenge, not content. */
export function looksLikeChallenge(html: string): boolean {
  const h = html.toLowerCase();
  return (
    h.includes('verifying your connection') ||
    h.includes('please wait while we verify') ||
    h.includes('just a moment') ||
    h.includes('attention required')
  );
}
