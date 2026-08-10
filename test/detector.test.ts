// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { runDetector } from '../lib/detector';
import { CONFIG } from '../lib/config';

/** Build a page with N filler links plus any extra anchors, then run detector. */
function renderPage(html: string, title = 'Test Shop') {
  document.title = title;
  // 5+ links needed to pass the bot-block heuristic; add filler nav links.
  const filler = Array.from({ length: 6 }, (_, i) => `<a href="/nav-${i}">Nav ${i}</a>`).join('');
  document.body.innerHTML = filler + html;
}

describe('runDetector() — layer 1 link-scan', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.title = '';
  });

  it('strong anchor text ⇒ isStrong link hit', () => {
    renderPage('<a href="/affiliates">Affiliate Program</a>');
    const r = runDetector(CONFIG);
    expect(r.loadStatus).toBe('ok');
    const hit = r.linkHits?.find((h) => h.href.includes('/affiliates'));
    expect(hit?.isStrong).toBe(true);
  });

  it('affiliate platform outbound ⇒ platformHits + strong', () => {
    renderPage('<a href="https://af.uppromote.com/x/register">Bli en affiliatepartner</a>');
    const r = runDetector(CONFIG);
    expect(r.platformHits).toContain('uppromote');
    expect(r.linkHits?.some((h) => h.isStrong)).toBe(true);
  });

  it('weak-only anchor ⇒ non-strong hit', () => {
    renderPage('<a href="/pages/trade">Trade</a>');
    const r = runDetector(CONFIG);
    const hit = r.linkHits?.find((h) => h.href.includes('/pages/trade'));
    expect(hit).toBeDefined();
    expect(hit?.isStrong).toBe(false);
  });

  it('no relevant anchors ⇒ ok with empty linkHits', () => {
    renderPage('<a href="/about">About</a>');
    const r = runDetector(CONFIG);
    expect(r.loadStatus).toBe('ok');
    expect(r.linkHits).toEqual([]);
    expect(r.platformHits).toEqual([]);
  });

  it('dedupes repeated hrefs', () => {
    renderPage('<a href="/affiliates">Affiliate</a><a href="/affiliates">Affiliate again</a>');
    const r = runDetector(CONFIG);
    expect(r.linkHits?.filter((h) => h.href.includes('/affiliates'))).toHaveLength(1);
  });
});

describe('runDetector() — bot-block heuristic (docs/05 §7)', () => {
  it('fewer than 5 links ⇒ blocked', () => {
    document.title = 'Shop';
    document.body.innerHTML = '<a href="/a">a</a><a href="/b">b</a>';
    const r = runDetector(CONFIG);
    expect(r.loadStatus).toBe('blocked');
  });

  it('challenge title ⇒ blocked even with many links', () => {
    renderPage('<a href="/affiliates">Affiliate</a>', 'Just a moment...');
    const r = runDetector(CONFIG);
    expect(r.loadStatus).toBe('blocked');
  });

  it('challenge body text ⇒ blocked', () => {
    document.title = 'Shop';
    document.body.innerHTML =
      'Please enable JavaScript and cookies to continue' +
      Array.from({ length: 6 }, (_, i) => `<a href="/n-${i}">n</a>`).join('');
    const r = runDetector(CONFIG);
    expect(r.loadStatus).toBe('blocked');
  });
});

describe('runDetector() — platform host matching (C1 anti-hallucination)', () => {
  it('does NOT match "awin" inside an unrelated host like drawing.com', () => {
    renderPage('<a href="https://www.drawing.com/gallery">Drawing gallery</a>');
    const r = runDetector(CONFIG);
    expect(r.platformHits).toEqual([]);
    // no fabricated strong hit
    expect(r.linkHits?.some((h) => h.isStrong)).toBe(false);
  });

  it('matches a real affiliate-platform subdomain host (af.uppromote.com)', () => {
    renderPage('<a href="https://af.uppromote.com/x/register">join</a>');
    const r = runDetector(CONFIG);
    expect(r.platformHits).toContain('uppromote');
  });

  it('matches a full-host platform token (impact.com) but not a path substring', () => {
    renderPage(
      '<a href="https://track.impact.com/abc">a</a>' +
        '<a href="https://shop.example/impact.com-guide">b</a>',
    );
    const r = runDetector(CONFIG);
    expect(r.platformHits ?? []).toContain('impact.com');
    expect((r.platformHits ?? []).filter((p) => p === 'impact.com')).toHaveLength(1);
  });
});

describe('runDetector() — injection self-containment (criterion 4 / L2)', () => {
  it('survives reconstruction from toString() (no module-scope references)', () => {
    renderPage('<a href="/affiliates">Affiliate Program</a>');
    // If runDetector closed over an import, the rebuilt fn would ReferenceError.
    const rebuilt = new Function(`return (${runDetector.toString()})`)() as typeof runDetector;
    const r = rebuilt(CONFIG);
    expect(r.loadStatus).toBe('ok');
    expect(r.linkHits?.some((h) => h.isStrong)).toBe(true);
  });
});
