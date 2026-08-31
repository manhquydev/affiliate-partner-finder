// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { runDetector } from '../lib/detector';
import { classify } from '../lib/classify';
import { CONFIG } from '../lib/config';

/** Build a page with N filler links plus any extra anchors, then run detector. */
function renderPage(html: string, title = 'Test Shop') {
  document.title = title;
  const filler = Array.from({ length: 6 }, (_, i) => `<a href="/nav-${i}">Nav ${i}</a>`).join('');
  document.body.innerHTML = filler + html;
}

describe('trade precision — williamwood / ozdesign / mohd.it', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.title = '';
  });

  it('P-WW: Trade + Partner With Us; path /pages/trade 200 → partner_trade/medium', () => {
    renderPage(
      '<a href="/pages/trade">Trade</a><a href="/pages/partner-with-us">Partner With Us</a>',
    );
    const det = runDetector(CONFIG);
    const trade = det.linkHits?.find((h) => h.href.includes('/pages/trade'));
    expect(trade).toBeDefined();
    expect(trade?.isStrong).toBe(false);
    expect(trade?.kw).toContain('trade');
    const cls = classify({
      loadStatus: 'ok',
      linkHits: det.linkHits ?? [],
      platformHits: det.platformHits ?? [],
      pathHits: [{ path: '/pages/trade', status: 200, finalUrl: '', isStrong: false }],
    });
    expect(cls).toEqual({ verdict: 'partner_trade', confidence: 'medium' });
    expect(cls.verdict).not.toBe('affiliate');
  });

  it('P-OZ: /trade-commercial/ weak-only → partner_trade/low', () => {
    renderPage('<a href="/trade-commercial/">STYLISTS & COMMERCIAL</a>');
    const det = runDetector(CONFIG);
    const hit = det.linkHits?.find((h) => h.href.includes('/trade-commercial'));
    expect(hit).toBeDefined();
    expect(hit?.isStrong).toBe(false);
    expect(hit?.kw).toContain('trade');
    const cls = classify({
      loadStatus: 'ok',
      linkHits: det.linkHits ?? [],
      platformHits: det.platformHits ?? [],
      pathHits: [],
    });
    expect(cls).toEqual({ verdict: 'partner_trade', confidence: 'low' });
    expect(cls.verdict).not.toBe('affiliate');
  });

  it('P-MO: Trade & Professionals weak-only → partner_trade/low', () => {
    renderPage('<a href="/en/trade-and-professionals/">Trade & Professionals</a>');
    const det = runDetector(CONFIG);
    const hit = det.linkHits?.find((h) => h.href.includes('/en/trade-and-professionals'));
    expect(hit).toBeDefined();
    expect(hit?.isStrong).toBe(false);
    expect(hit?.kw).toContain('trade');
    const cls = classify({
      loadStatus: 'ok',
      linkHits: det.linkHits ?? [],
      platformHits: det.platformHits ?? [],
      pathHits: [],
    });
    expect(cls).toEqual({ verdict: 'partner_trade', confidence: 'low' });
    expect(cls.verdict).not.toBe('affiliate');
  });

  it('P-NONE: about/contact only → none/high', () => {
    renderPage('<a href="/about">About</a><a href="/contact">Contact</a>');
    const det = runDetector(CONFIG);
    expect(det.linkHits ?? []).toEqual([]);
    expect(
      classify({
        loadStatus: 'ok',
        linkHits: det.linkHits ?? [],
        platformHits: det.platformHits ?? [],
        pathHits: [],
      }),
    ).toEqual({ verdict: 'none', confidence: 'high' });
  });

  it('P-ODR: EU ODR trader.register href is not trade — none/high', () => {
    renderPage(
      '<a href="https://ec.europa.eu/consumers/odr/main/?event=main.trader.register&lng=IT">ODR</a>',
    );
    const det = runDetector(CONFIG);
    const odr = det.linkHits?.find((h) => h.href.includes('trader.register'));
    expect(odr).toBeUndefined();
    expect(det.linkHits ?? []).toEqual([]);
    const cls = classify({
      loadStatus: 'ok',
      linkHits: det.linkHits ?? [],
      platformHits: det.platformHits ?? [],
      pathHits: [],
    });
    expect(cls).toEqual({ verdict: 'none', confidence: 'high' });
    expect(cls.verdict).not.toBe('affiliate');
    expect(cls.verdict).not.toBe('partner_trade');
  });

  it('P-BLOCK: Just a moment + <5 links → unknown, never none', () => {
    document.title = 'Just a moment';
    document.body.innerHTML = '<a href="/x">x</a>';
    const det = runDetector(CONFIG);
    expect(det.loadStatus).toBe('blocked');
    const cls = classify({
      loadStatus: det.loadStatus,
      linkHits: det.linkHits ?? [],
      platformHits: det.platformHits ?? [],
      pathHits: [],
    });
    expect(cls).toEqual({ verdict: 'unknown', confidence: 'blocked' });
    expect(cls.verdict).not.toBe('none');
  });
});
