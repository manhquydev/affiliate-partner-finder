import { describe, it, expect } from 'vitest';
import { AFFILIATE_PLATFORMS } from '../lib/config';
import { NetworkHostCollector } from '../lib/network-collector';

describe('NetworkHostCollector', () => {
  it('dedupes platform tokens across request/response URLs', () => {
    const c = new NetworkHostCollector(AFFILIATE_PLATFORMS);
    c.addUrl('https://www.dwin1.com/a.js');
    c.addUrl('https://dwin1.com/b.js');
    c.addUrl('https://www.uppromote.com/pixel');
    c.addUrl('https://example.com/logo.png');
    expect(c.matchedPlatforms().sort()).toEqual(['awin', 'uppromote'].sort());
  });

  it('known-none URLs stay empty (substring FP guard)', () => {
    const c = new NetworkHostCollector(AFFILIATE_PLATFORMS);
    c.addUrl('https://www.drawing.com/gallery');
    c.addUrl('https://cdn.example.com/awinning.js');
    expect(c.matchedPlatforms()).toEqual([]);
  });

  it('matches Impact Radius event CDN via allowlist alias', () => {
    const c = new NetworkHostCollector(AFFILIATE_PLATFORMS);
    c.addUrl('https://d.impactradius-event.com/A123/click');
    expect(c.matchedPlatforms()).toEqual(['impact.com']);
  });

  it('ignores empty / unparseable URLs', () => {
    const c = new NetworkHostCollector(AFFILIATE_PLATFORMS);
    c.addUrl('');
    c.addUrl('not-a-url');
    expect(c.matchedPlatforms()).toEqual([]);
  });
});
