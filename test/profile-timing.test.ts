import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { attachProfileTimings } from '../cli/profile-timing';
import { toCSV, toSimpleCSV } from '../lib/export';
import type { ScanResult } from '../lib/types';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function sample(over: Partial<ScanResult> = {}): ScanResult {
  return {
    domain: 'example.com',
    websiteUrl: 'https://example.com',
    finalUrl: 'https://example.com/',
    loadStatus: 'ok',
    verdict: 'none',
    confidence: 'high',
    evidence: { linkHits: [], platformHits: [], pathHits: [], junkBaselineStatus: 404 },
    scannedAt: '2026-08-26T00:00:00Z',
    detectorVersion: '1.0.0',
    name: 'Example Co',
    ...over,
  };
}

describe('attachProfileTimings', () => {
  it('writes timingsMs when flag on', () => {
    const result = sample();
    attachProfileTimings(result, true, 1_000, { goto: 10, settle: 20, detector: 30, probe: 40 }, 1_150);
    expect(result.timingsMs).toEqual({
      goto: 10,
      settle: 20,
      detector: 30,
      probe: 40,
      total: 150,
    });
  });

  it('omits timingsMs when flag off (default)', () => {
    const result = sample();
    attachProfileTimings(result, false, 1_000, { goto: 10, settle: 20, detector: 30, probe: 40 }, 1_150);
    expect(result.timingsMs).toBeUndefined();
    expect('timingsMs' in result).toBe(false);
  });

  it('does not call Date.now when flag off', () => {
    const spy = vi.spyOn(Date, 'now');
    attachProfileTimings(sample(), false, 1_000, { goto: 1, settle: 2, detector: 3, probe: 4 });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('JSONL row includes timingsMs only when attached', () => {
    const on = sample();
    attachProfileTimings(on, true, 0, { goto: 1, settle: 2, detector: 3, probe: 4 }, 10);
    const off = sample();
    attachProfileTimings(off, false, 0, { goto: 1, settle: 2, detector: 3, probe: 4 }, 10);
    const onRow = JSON.parse(JSON.stringify(on)) as ScanResult;
    const offRow = JSON.parse(JSON.stringify(off)) as ScanResult;
    expect(onRow.timingsMs).toEqual({ goto: 1, settle: 2, detector: 3, probe: 4, total: 10 });
    expect(offRow.timingsMs).toBeUndefined();
  });
});

describe('toSimpleCSV unchanged', () => {
  it('does not add a timings column when timingsMs is present', () => {
    const result = sample();
    attachProfileTimings(result, true, 0, { goto: 11, settle: 22, detector: 33, probe: 44 }, 100);
    const simple = toSimpleCSV([result]);
    expect(simple.split('\n')[0]).toBe('ten_cong_ty,website,ket_qua,huong_dan');
    expect(simple).not.toContain('timingsMs');
    expect(simple).not.toContain('goto');
    expect(toCSV([result]).split('\n')[0]).toBe(
      'domain,website,finalUrl,verdict,confidence,loadStatus,evidenceUrl,evidenceText,method,trustScore,reviews,scannedAt',
    );
    expect(toCSV([result])).not.toContain('timingsMs');
  });
});

describe('CLI --profile-timing', () => {
  it('appears in --help as default OFF', () => {
    const tsx = join(root, 'node_modules', '.bin', 'tsx');
    const out = execFileSync(tsx, ['cli/index.ts', '--help'], {
      encoding: 'utf8',
      cwd: root,
    });
    expect(out).toMatch(/--profile-timing\s+Record per-phase timingsMs in JSONL \(default OFF\)/);
  });
});

describe('analyze-track-s-timings', () => {
  it('outputs P50/P95 per phase from JSONL', () => {
    const rows = [
      sample({
        timingsMs: { goto: 10, settle: 100, detector: 5, probe: 200, total: 400 },
      }),
      sample({
        domain: 'b.example',
        timingsMs: { goto: 20, settle: 200, detector: 15, probe: 300, total: 600 },
      }),
      sample({
        domain: 'c.example',
        timingsMs: { goto: 30, settle: 300, detector: 25, probe: 400, total: 800 },
      }),
      sample({ domain: 'no-timing.example' }),
    ];
    const dir = mkdtempSync(join(tmpdir(), 'track-s-timings-'));
    const jsonl = join(dir, 'results.jsonl');
    writeFileSync(jsonl, rows.map((r) => JSON.stringify(r)).join('\n'));
    const out = execFileSync(process.execPath, [join(root, 'scripts', 'analyze-track-s-timings.mjs'), jsonl], {
      encoding: 'utf8',
    });
    expect(out.trim()).toBe(
      [
        'goto: n=3 p50=20 p95=30',
        'settle: n=3 p50=200 p95=300',
        'detector: n=3 p50=15 p95=25',
        'probe: n=3 p50=300 p95=400',
        'total: n=3 p50=600 p95=800',
      ].join('\n'),
    );
  });
});
