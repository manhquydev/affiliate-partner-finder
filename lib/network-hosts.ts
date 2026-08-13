// Pure host-boundary matcher for network (and shared) platform evidence.
// Same rules as the inject detector's nested isPlatformHost (lib/detector.ts) —
// never substring-match tokens inside unrelated labels (drawing.com ⊄ awin).
//
// CDN / tracking aliases (phase 2): allowlist of exact host suffixes only.
// Do not add bare keyword contains.

/**
 * Explicit CDN/tracking host → platform token (allowlist only).
 * Exact registrable host or subdomain suffix — never bare keyword contains.
 * Minimal Awin / Impact track hosts (phase 2).
 */
export const NETWORK_CDN_ALIASES: Readonly<Record<string, string>> = {
  // Awin creatives CDN (brand token "awin" does not match label "dwin1")
  'dwin1.com': 'awin',
  // Impact Radius tracking / event CDNs
  'impactradius.com': 'impact.com',
  'impactradius-event.com': 'impact.com',
};

/** Extract hostname from a URL; empty on parse failure. */
export function hostOf(url: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Host-boundary match: token with a dot matches that registrable host (or subdomain);
 * brand tokens match a whole DNS label (optional trailing digits), never a substring.
 */
export function isPlatformHost(host: string, token: string): boolean {
  if (!host || !token) return false;
  const h = host.toLowerCase();
  const t = token.toLowerCase();
  // full-host tokens like "cj.com" / "impact.com"
  if (t.includes('.')) return h === t || h.endsWith('.' + t);
  // brand tokens ("awin", "uppromote"): whole label, allowing awin1.com etc.
  return h
    .split('.')
    .some((label) => label === t || new RegExp(`^${t}\\d+$`).test(label));
}

/**
 * Match a hostname against platform tokens + optional CDN alias allowlist.
 * Aliases are exact registrable / suffix hosts only (see NETWORK_CDN_ALIASES).
 */
export function matchPlatformOnHost(
  host: string,
  platforms: readonly string[],
  aliases: Readonly<Record<string, string>> = NETWORK_CDN_ALIASES,
): string[] {
  if (!host) return [];
  const h = host.toLowerCase();
  const hits: string[] = [];

  for (const token of platforms) {
    if (isPlatformHost(h, token) && !hits.includes(token)) hits.push(token);
  }

  for (const [aliasHost, platform] of Object.entries(aliases)) {
    if (!aliasHost || !platform) continue;
    // suffix / exact only — never bare contains
    if ((h === aliasHost || h.endsWith('.' + aliasHost)) && !hits.includes(platform)) {
      hits.push(platform);
    }
  }

  return hits;
}

/** Match request/response URL against platforms (+ CDN aliases). */
export function matchPlatformOnUrl(
  url: string,
  platforms: readonly string[],
  aliases: Readonly<Record<string, string>> = NETWORK_CDN_ALIASES,
): string[] {
  return matchPlatformOnHost(hostOf(url), platforms, aliases);
}
