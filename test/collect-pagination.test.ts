import { describe, expect, it } from 'vitest';
import {
  clampCollectLimit,
  maxPagesForLimit,
  nextCollectAction,
  parseLimitInput,
} from '../lib/collect-pagination.ts';

describe('collect pagination', () => {
  it('parseLimitInput treats Vietnamese 10.000 as 10000 not 10', () => {
    expect(parseLimitInput('10.000')).toBe(10000);
    expect(parseLimitInput('10,000')).toBe(10000);
    expect(parseLimitInput('10000')).toBe(10000);
    expect(parseLimitInput('10')).toBe(10);
    expect(parseLimitInput('')).toBe(20);
  });

  it('clampCollectLimit rejects NaN and caps 10000', () => {
    expect(clampCollectLimit(Number.NaN)).toBe(20);
    expect(clampCollectLimit(99999)).toBe(10000);
    expect(clampCollectLimit(0)).toBe(1);
  });

  it('maxPagesForLimit floors 40, 10k→1000, and never exceeds 1000', () => {
    expect(maxPagesForLimit(20)).toBe(40);
    expect(maxPagesForLimit(200)).toBe(40);
    expect(maxPagesForLimit(10000)).toBe(1000);
    expect(maxPagesForLimit(99999)).toBe(1000);
  });

  it('retries WAF empty pages instead of ending collect', () => {
    expect(
      nextCollectAction({
        rawOnPage: 0,
        collected: 105,
        limit: 10000,
        pageNum: 12,
        maxPages: 1000,
        currentPage: 12,
        totalPages: 12,
        challenged: true,
        wafRetries: 0,
      }),
    ).toBe('retry-waf');
    expect(
      nextCollectAction({
        rawOnPage: 0,
        collected: 105,
        limit: 10000,
        pageNum: 12,
        maxPages: 1000,
        currentPage: 12,
        totalPages: 12,
        challenged: true,
        wafRetries: 3,
      }),
    ).toBe('challenge-stop');
  });

  it('does not trust totalPages when the page still looks full', () => {
    expect(
      nextCollectAction({
        rawOnPage: 20,
        collected: 105,
        limit: 10000,
        pageNum: 6,
        maxPages: 1000,
        currentPage: 6,
        totalPages: 6,
        challenged: false,
        wafRetries: 0,
      }),
    ).toBe('continue');
    expect(
      nextCollectAction({
        rawOnPage: 3,
        collected: 105,
        limit: 10000,
        pageNum: 6,
        maxPages: 1000,
        currentPage: 6,
        totalPages: 6,
        challenged: false,
        wafRetries: 0,
      }),
    ).toBe('last-page');
  });
});
