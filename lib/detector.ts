// Layer 1 detector — runs INSIDE the target page via chrome.scripting.executeScript.
//
// CRITICAL: this function is serialized and injected, so it must be fully
// self-contained — it may NOT reference module-scope imports or other functions.
// It receives its config via the `cfg` argument. `import type` is erased at
// build time, so type-only imports are safe.

import type { DetectorConfig, DetectorResult, LinkHit } from './types';

/** Bot-block phrases seen in <title> on challenge pages (docs/05 §7). */
// (kept inline inside the function — do not hoist to module scope)

export function runDetector(cfg: DetectorConfig): DetectorResult {
  const { strong, weak, platforms } = cfg;

  const title = (document.title || '').toLowerCase();
  const blockTitlePhrases = [
    'just a moment',
    'attention required',
    'verifying',
    'access denied',
    'cloudflare',
    'checking your browser',
  ];
  const bodyText = (
    document.body?.innerText ||
    document.body?.textContent ||
    ''
  ).toLowerCase();
  const blockBodyPhrases = [
    'enable javascript and cookies to continue',
    'checking your browser',
  ];

  // innerText is preferred (visible text) but is unavailable in jsdom, so fall
  // back to textContent, then aria-label.
  const anchors = Array.from(document.querySelectorAll('a')).map((a) => ({
    t: (
      (a as HTMLElement).innerText ||
      a.textContent ||
      a.getAttribute('aria-label') ||
      ''
    ).trim(),
    h: (a as HTMLAnchorElement).href || a.getAttribute('href') || '',
  }));

  const blockedByTitle = blockTitlePhrases.some((s) => title.includes(s));
  const blockedByBody = blockBodyPhrases.some((s) => bodyText.includes(s));
  // Fewer than 5 links after load usually means a challenge/interstitial page.
  if (blockedByTitle || blockedByBody || anchors.length < 5) {
    return { loadStatus: 'blocked', totalLinks: anchors.length };
  }

  // Platform match must be on the outbound HOST (docs/05 §3), not anywhere in
  // the URL string — otherwise "drawing.com".includes("awin") fabricates a
  // strong affiliate hit. Nested so runDetector stays self-contained for
  // executeScript injection.
  const hostOf = (href: string): string => {
    try {
      return new URL(href).hostname.toLowerCase();
    } catch {
      return '';
    }
  };
  const isPlatformHost = (host: string, token: string): boolean => {
    if (!host) return false;
    // full-host tokens like "cj.com" / "impact.com"
    if (token.includes('.')) return host === token || host.endsWith('.' + token);
    // brand tokens ("awin", "uppromote"): match a whole domain label, allowing a
    // trailing number (awin → awin1.com). Never a substring of a longer label.
    return host
      .split('.')
      .some((label) => label === token || new RegExp(`^${token}\\d+$`).test(label));
  };

  const linkHits: LinkHit[] = [];
  const platformHits: string[] = [];
  const seenHref = new Set<string>();

  for (const a of anchors) {
    const lt = a.t.toLowerCase();
    const lh = a.h.toLowerCase();
    const host = hostOf(a.h);
    const ks = strong.filter((k) => lt.includes(k) || lh.includes(k));
    // `trade` is word-bounded so href `...trader.register` (EU ODR) is not a hit.
    // Hyphen/slash still match: /pages/trade, /trade-commercial/, trade-and-professionals.
    const kw = weak.filter((k) => {
      if (k === 'trade') return /\btrade\b/i.test(lt) || /\btrade\b/i.test(lh);
      return lt.includes(k) || lh.includes(k);
    });
    const plat = platforms.filter((p) => isPlatformHost(host, p));

    for (const p of plat) {
      if (!platformHits.includes(p)) platformHits.push(p);
    }

    if (ks.length || kw.length || plat.length) {
      if (!seenHref.has(a.h)) {
        seenHref.add(a.h);
        linkHits.push({
          text: a.t.slice(0, 80),
          href: a.h,
          kw: [...ks, ...kw],
          platform: plat,
          isStrong: ks.length > 0 || plat.length > 0,
        });
      }
    }
  }

  return {
    loadStatus: 'ok',
    totalLinks: anchors.length,
    linkHits,
    platformHits,
  };
}
