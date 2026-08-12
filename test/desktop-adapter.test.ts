import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildScanArgv, clampConcurrency, clampDelayMs, defaultDesktopProfileDir } from '../desktop/build-scan-argv';
import {
  assertOutJobLockFree,
  isProcessAlive,
  readOutJobLock,
  releaseOutJobLock,
  writeOutJobLock,
} from '../desktop/job-lock';
import {
  assertSafeJobPaths,
  canStartFresh,
  readProgress,
} from '../desktop/progress';
import {
  countKetQuaFromJsonl,
  parseCliStatusLine,
  writeSimpleCsvFromJsonl,
} from '../desktop/ket-qua-counts';
import { formatCounts, formatProgress } from '../desktop/format';
import type { ScanResult } from '../lib/types';

function sample(partial: Partial<ScanResult> & Pick<ScanResult, 'domain' | 'loadStatus' | 'verdict'>): ScanResult {
  return {
    websiteUrl: `https://${partial.domain}`,
    finalUrl: `https://${partial.domain}`,
    confidence: 'high',
    evidence: { linkHits: [], platformHits: [], pathHits: [] },
    scannedAt: new Date().toISOString(),
    detectorVersion: 'test',
    name: partial.domain,
    ...partial,
  };
}

describe('desktop adapter', () => {
  it('clamps concurrency and delay', () => {
    expect(clampConcurrency(99)).toBe(3);
    expect(clampConcurrency(0)).toBe(1);
    expect(clampDelayMs(0)).toBe(1000);
    expect(clampDelayMs(500)).toBe(1000);
    expect(clampDelayMs(2000)).toBe(2000);
  });

  it('buildScanArgv includes scan-profile and clamps', () => {
    const args = buildScanArgv({
      query: 'design',
      limit: 10,
      out: '/tmp/out1',
      profile: '/tmp/profile1',
      concurrency: 99,
      delayMs: 0,
      platform: 'linux',
    });
    expect(args).toContain('--scan-profile');
    expect(args).toContain('--accept-failures');
    expect(args[args.indexOf('--concurrency') + 1]).toBe('3');
    expect(args[args.indexOf('--delay-ms') + 1]).toBe('1000');
    expect(args).not.toContain('--virtual-display');
    expect(args).not.toContain('--early-exit');
  });

  it('buildScanArgv passes --early-exit when enabled', () => {
    const args = buildScanArgv({
      query: 'design',
      out: '/tmp/out1',
      profile: '/tmp/profile1',
      earlyExit: true,
      platform: 'linux',
    });
    expect(args).toContain('--early-exit');
  });

  it('win32 always has profile and never virtual-display', () => {
    const args = buildScanArgv({
      query: 'design',
      out: 'C:\\Users\\a\\Documents\\AffiliatePartnerFinder\\runs\\r1',
      profile: 'C:\\Users\\a\\AppData\\Local\\affiliate-partner-finder\\chrome-profile',
      platform: 'win32',
    });
    expect(args).toContain('--profile');
    expect(args).not.toContain('--virtual-display');
  });

  it('resume omits query requirement', () => {
    const args = buildScanArgv({
      resume: true,
      out: '/tmp/out1',
      profile: '/tmp/profile1',
      platform: 'linux',
    });
    expect(args).toContain('--resume');
    expect(args).not.toContain('--query');
  });

  it('defaultDesktopProfileDir uses LOCALAPPDATA on win32', () => {
    const p = defaultDesktopProfileDir({ LOCALAPPDATA: 'D:\\Local' }, 'win32');
    expect(p.replace(/\\/g, '/')).toBe('D:/Local/affiliate-partner-finder/chrome-profile');
  });

  it('assertSafeJobPaths rejects Chrome User Data', () => {
    expect(() =>
      assertSafeJobPaths({
        out: '/home/u/runs/a',
        profile: '/home/u/.config/google-chrome/User Data',
      }),
    ).toThrow(/User Data/);
  });

  it('assertSafeJobPaths enforces out root', () => {
    expect(() =>
      assertSafeJobPaths({
        out: '/tmp/evil',
        profile: '/tmp/profile',
        allowedOutRoot: '/home/u/runs',
      }),
    ).toThrow(/out directory/);
  });

  it('readProgress and canStartFresh', () => {
    const dir = mkdtempSync(join(tmpdir(), 'apf-desk-'));
    expect(readProgress(dir)).toBeNull();
    expect(canStartFresh(dir)).toBe(true);
    writeFileSync(
      join(dir, 'progress.json'),
      JSON.stringify({
        query: 'design',
        total: 10,
        completed: 3,
        updatedAt: '2026-08-12T00:00:00.000Z',
        earlyExit: false,
      }),
    );
    expect(readProgress(dir)?.completed).toBe(3);
    writeFileSync(join(dir, 'companies.json'), '[]');
    expect(canStartFresh(dir)).toBe(false);
  });

  it('countKetQuaFromJsonl skips truncated line and maps loadStatus', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'apf-jsonl-'));
    const path = join(dir, 'results.jsonl');
    const okNone = sample({ domain: 'a.com', loadStatus: 'ok', verdict: 'none' });
    const blocked = sample({ domain: 'b.com', loadStatus: 'blocked', verdict: 'unknown' });
    const aff = sample({
      domain: 'c.com',
      loadStatus: 'ok',
      verdict: 'affiliate',
      evidence: {
        linkHits: [{ href: 'https://x', text: 'affiliate', kw: ['affiliate'] }],
        platformHits: [],
        pathHits: [],
      },
    });
    writeFileSync(
      path,
      `${JSON.stringify(okNone)}\n${JSON.stringify(blocked)}\n${JSON.stringify(aff)}\n{"domain":"trunc`,
    );
    const counts = await countKetQuaFromJsonl(path);
    expect(counts).toEqual({ true: 1, false: 1, unknown: 1 });
  });

  it('writeSimpleCsvFromJsonl writes ket_qua columns', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'apf-csv-'));
    const row = sample({ domain: 'a.com', loadStatus: 'ok', verdict: 'none', name: 'A' });
    writeFileSync(join(dir, 'results.jsonl'), JSON.stringify(row) + '\n');
    const csv = await writeSimpleCsvFromJsonl(dir);
    const body = await import('node:fs').then((fs) => fs.readFileSync(csv, 'utf8'));
    expect(body.split('\n')[0]).toBe('ten_cong_ty,website,ket_qua,huong_dan');
    expect(body).toContain('false');
  });

  it('parseCliStatusLine', () => {
    expect(parseCliStatusLine('[cli] scan foo.com → https://foo.com')).toEqual({
      kind: 'scan',
      domain: 'foo.com',
    });
    expect(parseCliStatusLine('[cli] done foo.com none/high (ok)')).toEqual({
      kind: 'done',
      domain: 'foo.com',
    });
  });

  it('format helpers', () => {
    expect(formatProgress(null)).toMatch(/Chưa/);
    expect(
      formatProgress({
        query: 'x',
        total: 100,
        completed: 25,
        updatedAt: '',
        earlyExit: false,
      }),
    ).toContain('25%');
    expect(formatCounts({ true: 1, false: 2, unknown: 3 })).toContain('unknown 3');
  });

  it('out job lock rejects live pid and clears stale', () => {
    const dir = mkdtempSync(join(tmpdir(), 'apf-lock-'));
    writeOutJobLock(dir, {
      pid: process.pid,
      out: dir,
      profile: '/tmp/p',
      startedAt: new Date().toISOString(),
    });
    expect(() => assertOutJobLockFree(dir)).toThrow(/PID/);
    expect(readOutJobLock(dir)?.pid).toBe(process.pid);
    releaseOutJobLock(dir);
    expect(readOutJobLock(dir)).toBeNull();
    assertOutJobLockFree(dir);
    writeOutJobLock(dir, { pid: 999_999_999, out: dir, profile: '/tmp/p', startedAt: new Date().toISOString() });
    expect(isProcessAlive(999_999_999)).toBe(false);
    assertOutJobLockFree(dir);
    expect(readOutJobLock(dir)).toBeNull();
  });
});
