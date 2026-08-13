import { describe, it, expect } from 'vitest';
import { AFFILIATE_PLATFORMS } from '../lib/config';
import {
  hostOf,
  isPlatformHost,
  matchPlatformOnHost,
  matchPlatformOnUrl,
  NETWORK_CDN_ALIASES,
} from '../lib/network-hosts';

describe('network-hosts — hostOf', () => {
  it('parses absolute URLs', () => {
    expect(hostOf('https://www.awin1.com/cread.php?x=1')).toBe('www.awin1.com');
  });

  it('returns empty on garbage', () => {
    expect(hostOf('')).toBe('');
    expect(hostOf('not a url')).toBe('');
  });
});

describe('network-hosts — isPlatformHost (substring FP)', () => {
  it('does NOT match awin inside drawing.com', () => {
    expect(isPlatformHost('drawing.com', 'awin')).toBe(false);
    expect(isPlatformHost('www.drawing.com', 'awin')).toBe(false);
  });

  it('does NOT match awin as substring of longer label', () => {
    expect(isPlatformHost('drawawin.com', 'awin')).toBe(false);
    expect(isPlatformHost('awinning.com', 'awin')).toBe(false);
  });

  it('matches whole label and trailing-digit variants', () => {
    expect(isPlatformHost('awin.com', 'awin')).toBe(true);
    expect(isPlatformHost('www.awin.com', 'awin')).toBe(true);
    expect(isPlatformHost('awin1.com', 'awin')).toBe(true);
    expect(isPlatformHost('ui.awin.com', 'awin')).toBe(true);
  });

  it('matches dotted platform tokens as suffix/exact only', () => {
    expect(isPlatformHost('impact.com', 'impact.com')).toBe(true);
    expect(isPlatformHost('www.impact.com', 'impact.com')).toBe(true);
    expect(isPlatformHost('notimpact.com', 'impact.com')).toBe(false);
    expect(isPlatformHost('fakeimpact.com.evil', 'impact.com')).toBe(false);
  });
});

describe('network-hosts — matchPlatformOnHost / Url', () => {
  it('returns platform token for known affiliate host', () => {
    expect(matchPlatformOnHost('www.uppromote.com', AFFILIATE_PLATFORMS)).toContain('uppromote');
    expect(matchPlatformOnUrl('https://tapfiliate.com/x', AFFILIATE_PLATFORMS)).toContain('tapfiliate');
  });

  it('known-none host ⇒ empty (no substring FP)', () => {
    expect(matchPlatformOnHost('drawing.com', AFFILIATE_PLATFORMS)).toEqual([]);
    expect(matchPlatformOnUrl('https://www.drawing.com/gallery', AFFILIATE_PLATFORMS)).toEqual([]);
    expect(matchPlatformOnHost('example.com', AFFILIATE_PLATFORMS)).toEqual([]);
  });

  it('CDN aliases are allowlist suffix/exact only (no bare contains)', () => {
    const aliases = { 'dwin1.com': 'awin' };
    expect(matchPlatformOnHost('www.dwin1.com', AFFILIATE_PLATFORMS, aliases)).toContain('awin');
    expect(matchPlatformOnHost('dwin1.com', [], aliases)).toEqual(['awin']);
    // must not treat alias key as a substring keyword
    expect(matchPlatformOnHost('mydwin1com.example', [], aliases)).toEqual([]);
    expect(matchPlatformOnHost('xdwin1.com.evil.test', [], { 'dwin1.com': 'awin' })).toEqual([]);
  });

  it('default NETWORK_CDN_ALIASES includes minimal Awin/Impact track hosts', () => {
    expect(NETWORK_CDN_ALIASES['dwin1.com']).toBe('awin');
    expect(NETWORK_CDN_ALIASES['impactradius.com']).toBe('impact.com');
    expect(NETWORK_CDN_ALIASES['impactradius-event.com']).toBe('impact.com');
    expect(matchPlatformOnHost('www.dwin1.com', AFFILIATE_PLATFORMS)).toContain('awin');
    expect(matchPlatformOnHost('d.impactradius-event.com', AFFILIATE_PLATFORMS)).toContain('impact.com');
    // still no substring FP
    expect(matchPlatformOnHost('drawing.com', AFFILIATE_PLATFORMS)).toEqual([]);
  });
});
