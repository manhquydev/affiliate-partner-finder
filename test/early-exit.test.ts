import { describe, it, expect } from 'vitest';
import { shouldSkipPathProbe } from '../lib/early-exit';

describe('shouldSkipPathProbe', () => {
  it('skips when strong homepage link', () => {
    expect(
      shouldSkipPathProbe({
        loadStatus: 'ok',
        linkHits: [{ text: 'Affiliate', href: '/aff', kw: ['affiliate'], platform: [], isStrong: true }],
        platformHits: [],
      }),
    ).toBe(true);
  });

  it('skips when platform hit', () => {
    expect(
      shouldSkipPathProbe({
        loadStatus: 'ok',
        linkHits: [],
        platformHits: ['shareasale.com'],
      }),
    ).toBe(true);
  });

  it('does not skip on weak-only or blocked', () => {
    expect(
      shouldSkipPathProbe({
        loadStatus: 'ok',
        linkHits: [{ text: 'Partner', href: '/p', kw: ['partner'], platform: [], isStrong: false }],
        platformHits: [],
      }),
    ).toBe(false);
    expect(
      shouldSkipPathProbe({
        loadStatus: 'blocked',
        linkHits: [],
        platformHits: [],
      }),
    ).toBe(false);
  });

  it('skips when networkHits alone (network-evidence path)', () => {
    expect(
      shouldSkipPathProbe({
        loadStatus: 'ok',
        linkHits: [],
        platformHits: [],
        networkHits: ['awin'],
      }),
    ).toBe(true);
  });
});
