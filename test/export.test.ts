import { describe, it, expect } from 'vitest';
import { toCSV, toJSON, toSimpleCSV, simpleHit, strongestEvidence } from '../lib/export';
import type { ScanResult } from '../lib/types';

function result(over: Partial<ScanResult>): ScanResult {
  return {
    domain: 'example.com',
    websiteUrl: 'https://example.com',
    finalUrl: 'https://example.com/',
    loadStatus: 'ok',
    verdict: 'none',
    confidence: 'high',
    evidence: { linkHits: [], platformHits: [], pathHits: [], junkBaselineStatus: 404 },
    scannedAt: '2026-08-10T00:00:00Z',
    detectorVersion: '1.0.0',
    name: 'Example Co',
    ...over,
  };
}

const affiliate = result({
  domain: 'design-bestseller.de',
  name: 'Design Bestseller',
  verdict: 'affiliate',
  confidence: 'high',
  evidence: {
    linkHits: [{ text: 'Partnerprogramm', href: 'https://ui.awin.com/merchant-profile/14674', kw: ['partnerprogramm'], platform: ['awin'], isStrong: true }],
    platformHits: ['awin'],
    pathHits: [],
    junkBaselineStatus: 404,
  },
});

describe('export', () => {
  it('CSV header has the exact docs/06 §4 columns in order', () => {
    const header = toCSV([]).split('\n')[0];
    expect(header).toBe('domain,website,finalUrl,verdict,confidence,loadStatus,evidenceUrl,evidenceText,method,trustScore,reviews,scannedAt');
  });

  it('every affiliate row has a non-empty evidenceUrl', () => {
    const csv = toCSV([affiliate]);
    const cols = csv.split('\n')[1]!.split(',');
    // evidenceUrl is column index 6
    expect(cols[6]).toContain('awin.com');
    expect(strongestEvidence(affiliate).method).toBe('platform');
  });

  it('neutralizes CSV formula injection', () => {
    const evil = result({ domain: '=HYPERLINK("http://x")', verdict: 'none' });
    const line = toCSV([evil]).split('\n')[1]!;
    expect(line.startsWith("'=") || line.startsWith('"\'=')).toBe(true);
  });

  it('toJSON round-trips to a ScanResult[]', () => {
    const parsed = JSON.parse(toJSON([affiliate])) as ScanResult[];
    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.verdict).toBe('affiliate');
  });

  it('simpleHit: true for affiliate/partner signals, false for clean none, unknown when blocked', () => {
    expect(simpleHit(affiliate)).toBe('true');
    expect(
      simpleHit(
        result({
          evidence: {
            linkHits: [{ text: 'Wholesale', href: '/trade', kw: ['wholesale'], platform: [], isStrong: false }],
            platformHits: [],
            pathHits: [],
            junkBaselineStatus: 404,
          },
        }),
      ),
    ).toBe('true');
    expect(simpleHit(result({ loadStatus: 'ok', verdict: 'none' }))).toBe('false');
    expect(simpleHit(result({ loadStatus: 'blocked', verdict: 'unknown' }))).toBe('unknown');
  });

  it('toSimpleCSV is end-user columns only', () => {
    const header = toSimpleCSV([]).split('\n')[0];
    expect(header).toBe('ten_cong_ty,website,ket_qua,huong_dan');
    const line = toSimpleCSV([affiliate]).split('\n')[1]!;
    expect(line).toContain('Design Bestseller');
    expect(line).toContain('true');
    expect(line).not.toContain('confidence');
    expect(line).not.toContain('loadStatus');
  });
});
