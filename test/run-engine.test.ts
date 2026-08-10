import { describe, it, expect } from 'vitest';
import { isStale, pickStaleCompanies, pickUnscanned } from '../lib/run-engine';
import type { Company, ScanResult } from '../lib/types';

const NOW = Date.parse('2026-08-10T00:00:00Z');
const DAY = 86_400_000;

function company(domain: string): Company {
  return { name: domain, domain, trustScore: null, reviews: null, trustpilotUrl: '' };
}
function result(domain: string, scannedAt: string): ScanResult {
  return {
    domain,
    websiteUrl: `https://${domain}`,
    finalUrl: `https://${domain}/`,
    loadStatus: 'ok',
    verdict: 'none',
    confidence: 'high',
    evidence: { linkHits: [], platformHits: [], pathHits: [], junkBaselineStatus: 404 },
    scannedAt,
    detectorVersion: '1.0.0',
  };
}

describe('isStale', () => {
  it('fresh result within TTL is not stale', () => {
    const scannedAt = new Date(NOW - 5 * DAY).toISOString();
    expect(isStale(scannedAt, 30, NOW)).toBe(false);
  });
  it('result older than TTL is stale', () => {
    const scannedAt = new Date(NOW - 40 * DAY).toISOString();
    expect(isStale(scannedAt, 30, NOW)).toBe(true);
  });
  it('unparseable date is treated as stale', () => {
    expect(isStale('not-a-date', 30, NOW)).toBe(true);
  });
});

describe('pickStaleCompanies (refreshStale mode)', () => {
  it('includes never-scanned and stale, excludes fresh', () => {
    const companies = [company('a.com'), company('b.com'), company('c.com')];
    const results = new Map<string, ScanResult>([
      ['a.com', result('a.com', new Date(NOW - 2 * DAY).toISOString())], // fresh → exclude
      ['b.com', result('b.com', new Date(NOW - 60 * DAY).toISOString())], // stale → include
      // c.com never scanned → include
    ]);
    const picked = pickStaleCompanies(companies, results, 30, NOW).map((c) => c.domain);
    expect(picked).toEqual(['b.com', 'c.com']);
  });
});

describe('pickUnscanned (resume after close)', () => {
  it('returns only companies with no result at all', () => {
    const companies = [company('a.com'), company('b.com')];
    const results = new Map<string, ScanResult>([['a.com', result('a.com', new Date(NOW).toISOString())]]);
    expect(pickUnscanned(companies, results).map((c) => c.domain)).toEqual(['b.com']);
  });
});
