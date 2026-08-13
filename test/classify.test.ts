import { describe, it, expect } from 'vitest';
import { classify } from '../lib/classify';
import type { ClassifyInput } from '../lib/types';
import { GOLDEN_CASES } from './fixtures/golden';

const strongLink = { text: 'Affiliate Program', href: 'https://x.com/affiliates', kw: ['affiliate'], platform: [], isStrong: true };
const weakLink = { text: 'Trade', href: 'https://x.com/trade', kw: ['trade'], platform: [], isStrong: false };
const strongPath = { path: '/affiliate', status: 200, finalUrl: '', isStrong: true };
const weakPath = { path: '/pages/trade', status: 200, finalUrl: '', isStrong: false };

describe('classify() — decision table (docs/05 §6)', () => {
  it('row 1: loadStatus !== ok ⇒ unknown/blocked (NEVER none)', () => {
    for (const ls of ['blocked', 'timeout', 'error'] as const) {
      const out = classify({ loadStatus: ls, linkHits: [], platformHits: [], pathHits: [] });
      expect(out).toEqual({ verdict: 'unknown', confidence: 'blocked' });
    }
  });

  it('row 2a: strong linkHit ⇒ affiliate/high', () => {
    expect(classify({ loadStatus: 'ok', linkHits: [strongLink] })).toEqual({ verdict: 'affiliate', confidence: 'high' });
  });

  it('row 2b: platform outbound only ⇒ affiliate/high', () => {
    expect(classify({ loadStatus: 'ok', platformHits: ['uppromote'] })).toEqual({ verdict: 'affiliate', confidence: 'high' });
  });

  it('row 2c: networkHits alone ⇒ affiliate/high (same strength as platformHits)', () => {
    expect(classify({ loadStatus: 'ok', networkHits: ['awin'] })).toEqual({ verdict: 'affiliate', confidence: 'high' });
  });

  it('row 2d: networkHits do not override loadStatus!==ok → unknown', () => {
    expect(classify({ loadStatus: 'blocked', networkHits: ['awin'] })).toEqual({
      verdict: 'unknown',
      confidence: 'blocked',
    });
    expect(classify({ loadStatus: 'timeout', networkHits: ['uppromote'] }).verdict).toBe('unknown');
  });

  it('row 2e: known-none (empty networkHits) stays none/high', () => {
    expect(classify({ loadStatus: 'ok', linkHits: [], platformHits: [], networkHits: [], pathHits: [] })).toEqual({
      verdict: 'none',
      confidence: 'high',
    });
  });

  it('row 3: strong pathHit only ⇒ affiliate/medium', () => {
    expect(classify({ loadStatus: 'ok', pathHits: [strongPath] })).toEqual({ verdict: 'affiliate', confidence: 'medium' });
  });

  it('row 4: weak link AND weak path ⇒ partner_trade/medium', () => {
    expect(classify({ loadStatus: 'ok', linkHits: [weakLink], pathHits: [weakPath] })).toEqual({ verdict: 'partner_trade', confidence: 'medium' });
  });

  it('row 5a: weak link only ⇒ partner_trade/low', () => {
    expect(classify({ loadStatus: 'ok', linkHits: [weakLink] })).toEqual({ verdict: 'partner_trade', confidence: 'low' });
  });

  it('row 5b: weak path only ⇒ partner_trade/low', () => {
    expect(classify({ loadStatus: 'ok', pathHits: [weakPath] })).toEqual({ verdict: 'partner_trade', confidence: 'low' });
  });

  it('row 6: load ok, no hits ⇒ none/high', () => {
    expect(classify({ loadStatus: 'ok', linkHits: [], platformHits: [], pathHits: [] })).toEqual({ verdict: 'none', confidence: 'high' });
  });
});

describe('classify() — anti-hallucination invariants', () => {
  it('weak-only is NEVER upgraded to affiliate', () => {
    const out = classify({ loadStatus: 'ok', linkHits: [weakLink], pathHits: [weakPath] });
    expect(out.verdict).toBe('partner_trade');
  });

  it('blocked page never returns none even with zero hits', () => {
    const out = classify({ loadStatus: 'blocked', linkHits: [], platformHits: [], pathHits: [] });
    expect(out.verdict).not.toBe('none');
    expect(out.verdict).toBe('unknown');
  });

  it('strong signal wins over co-occurring weak signals', () => {
    const out = classify({ loadStatus: 'ok', linkHits: [strongLink, weakLink], pathHits: [weakPath] });
    expect(out).toEqual({ verdict: 'affiliate', confidence: 'high' });
  });
});

describe('classify() — golden set (docs/07 §2)', () => {
  for (const c of GOLDEN_CASES) {
    it(`${c.domain} ⇒ ${c.expected.verdict}/${c.expected.confidence}`, () => {
      expect(classify(c.input as ClassifyInput)).toEqual(c.expected);
    });
  }

  it('acceptance: 4/4 affiliate-high verdicts correct', () => {
    const affiliateHigh = GOLDEN_CASES.filter((c) => c.expected.verdict === 'affiliate' && c.expected.confidence === 'high');
    expect(affiliateHigh).toHaveLength(4);
    for (const c of affiliateHigh) {
      expect(classify(c.input as ClassifyInput)).toEqual({ verdict: 'affiliate', confidence: 'high' });
    }
  });

  it('acceptance: 0 blocked→none', () => {
    const blocked = GOLDEN_CASES.filter((c) => c.input.loadStatus !== 'ok');
    for (const c of blocked) {
      expect(classify(c.input as ClassifyInput).verdict).not.toBe('none');
    }
  });

  it('acceptance: 0 false-affiliate on the 5 none cases', () => {
    const noneCases = GOLDEN_CASES.filter((c) => c.expected.verdict === 'none');
    expect(noneCases).toHaveLength(5);
    for (const c of noneCases) {
      expect(classify(c.input as ClassifyInput).verdict).not.toBe('affiliate');
    }
  });
});
