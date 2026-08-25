import { existsSync, mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildScanArgv,
  clampConcurrency,
  clampDelayMs,
  defaultDesktopProfileDir,
  defaultDesktopRunsDir,
  resolveVirtualDisplay,
} from '../desktop/build-scan-argv';
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
import { JobSupervisor } from '../desktop/job-supervisor';
import type { JobStatus } from '../desktop/types';
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
      virtualDisplay: false,
      platform: 'linux',
    });
    expect(args).toContain('--scan-profile');
    expect(args).toContain('--accept-failures');
    expect(args[args.indexOf('--concurrency') + 1]).toBe('3');
    expect(args[args.indexOf('--delay-ms') + 1]).toBe('1000');
    expect(args).not.toContain('--virtual-display');
    expect(args).not.toContain('--early-exit');
  });

  it('buildScanArgv defaults to --virtual-display on linux (hide Chrome)', () => {
    const args = buildScanArgv({
      query: 'design',
      out: '/tmp/out1',
      profile: '/tmp/profile1',
      platform: 'linux',
    });
    expect(args).toContain('--virtual-display');
    const explicit = buildScanArgv({
      query: 'design',
      out: '/tmp/out1',
      profile: '/tmp/profile1',
      virtualDisplay: false,
      platform: 'linux',
    });
    expect(explicit).not.toContain('--virtual-display');
  });

  it('buildScanArgv defaults concurrency to 2 and passes 3 when turbo', () => {
    const normal = buildScanArgv({
      query: 'design',
      out: '/tmp/out1',
      profile: '/tmp/profile1',
      virtualDisplay: false,
      platform: 'linux',
    });
    expect(normal[normal.indexOf('--concurrency') + 1]).toBe('2');
    const turbo = buildScanArgv({
      query: 'design',
      out: '/tmp/out1',
      profile: '/tmp/profile1',
      concurrency: 3,
      virtualDisplay: false,
      platform: 'linux',
    });
    expect(turbo[turbo.indexOf('--concurrency') + 1]).toBe('3');
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

  it('buildScanArgv omits --lazy-settle by default (OFF)', () => {
    const args = buildScanArgv({
      query: 'design',
      out: '/tmp/out1',
      profile: '/tmp/profile1',
      platform: 'linux',
    });
    expect(args).not.toContain('--lazy-settle');
  });

  it('buildScanArgv passes --lazy-settle when enabled', () => {
    const args = buildScanArgv({
      query: 'design',
      out: '/tmp/out1',
      profile: '/tmp/profile1',
      lazySettle: true,
      platform: 'linux',
    });
    expect(args).toContain('--lazy-settle');
  });

  it('buildScanArgv omits --network-evidence by default', () => {
    const args = buildScanArgv({
      query: 'design',
      out: '/tmp/out1',
      profile: '/tmp/profile1',
      platform: 'linux',
    });
    expect(args).not.toContain('--network-evidence');
  });

  it('buildScanArgv passes --network-evidence when enabled', () => {
    const args = buildScanArgv({
      query: 'design',
      out: '/tmp/out1',
      profile: '/tmp/profile1',
      networkEvidence: true,
      platform: 'linux',
    });
    expect(args).toContain('--network-evidence');
  });

  it('win32 always has profile and defaults to --virtual-display (hide Chrome)', () => {
    const args = buildScanArgv({
      query: 'design',
      out: 'C:\\Users\\a\\Documents\\AffiliatePartnerFinder\\runs\\r1',
      profile: 'C:\\Users\\a\\AppData\\Local\\affiliate-partner-finder\\chrome-profile',
      platform: 'win32',
    });
    expect(args).toContain('--profile');
    expect(args).toContain('--virtual-display');
    const visible = buildScanArgv({
      query: 'design',
      out: 'C:\\Users\\a\\Documents\\AffiliatePartnerFinder\\runs\\r1',
      profile: 'C:\\Users\\a\\AppData\\Local\\affiliate-partner-finder\\chrome-profile',
      platform: 'win32',
      virtualDisplay: false,
    });
    expect(visible).not.toContain('--virtual-display');
  });

  it('resolveVirtualDisplay defaults ON on every platform', () => {
    expect(resolveVirtualDisplay('linux')).toBe(true);
    expect(resolveVirtualDisplay('linux', true)).toBe(true);
    expect(resolveVirtualDisplay('linux', false)).toBe(false);
    expect(resolveVirtualDisplay('win32')).toBe(true);
    expect(resolveVirtualDisplay('win32', true)).toBe(true);
    expect(resolveVirtualDisplay('win32', false)).toBe(false);
    expect(resolveVirtualDisplay('darwin', true)).toBe(true);
  });

  it('win32 virtualDisplay true does not throw and passes --virtual-display', () => {
    const opts = {
      query: 'design',
      out: 'C:\\Users\\a\\Documents\\AffiliatePartnerFinder\\runs\\r1',
      profile: 'C:\\Users\\a\\AppData\\Local\\affiliate-partner-finder\\chrome-profile',
      platform: 'win32' as const,
      virtualDisplay: true,
    };
    expect(() => buildScanArgv(opts)).not.toThrow();
    expect(buildScanArgv(opts)).toContain('--virtual-display');
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

  it('buildScanArgv rejects empty or whitespace query when not resuming', () => {
    const base = { out: '/tmp/out1', profile: '/tmp/profile1', platform: 'linux' as const };
    expect(() => buildScanArgv({ ...base, query: '' })).toThrow(/query is required/);
    expect(() => buildScanArgv({ ...base, query: '   \t' })).toThrow(/query is required/);
    expect(() => buildScanArgv({ ...base, query: undefined })).toThrow(/query is required/);
  });

  it('inspect-out returns empty query when progress.json missing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'apf-inspect-'));
    const progress = readProgress(dir);
    expect(progress).toBeNull();
    // mirrors desktop/main.ts desktop:inspect-out handler
    expect(progress?.query ?? '').toBe('');
    expect(canStartFresh(dir)).toBe(true);
  });

  it('assertSafeJobPaths rejects path traversal escape via ..', () => {
    const root = join(tmpdir(), 'apf-runs-root');
    mkdirSync(root, { recursive: true });
    const escape = join(root, '..', 'apf-escape');
    expect(() =>
      assertSafeJobPaths({
        out: escape,
        profile: join(tmpdir(), 'apf-profile'),
        allowedOutRoot: root,
      }),
    ).toThrow(/out directory/);
  });

  it('defaultDesktopRunsDir uses Documents on win32', () => {
    const p = defaultDesktopRunsDir({ USERPROFILE: 'C:\\Users\\alice' }, 'win32');
    expect(p.replace(/\\/g, '/')).toBe('C:/Users/alice/Documents/AffiliatePartnerFinder/runs');
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

describe('JobSupervisor failure surfacing', () => {
  function fakeCli(script: string) {
    return () => ({ command: process.execPath, prefixArgs: ['-e', script, '--'], cwd: tmpdir() });
  }

  async function runToFinal(script: string): Promise<JobStatus> {
    const statuses: JobStatus[] = [];
    const supervisor = new JobSupervisor({
      resolveCli: fakeCli(script),
      onStatus: (s) => statuses.push(s),
      pollMs: 50,
    });
    const root = mkdtempSync(join(tmpdir(), 'apf-sup-out-'));
    const profRoot = mkdtempSync(join(tmpdir(), 'apf-sup-prof-'));
    await supervisor.start({
      query: 'test',
      limit: 1,
      out: join(root, 'run1'),
      profile: join(profRoot, 'p'),
      resume: false,
      allowedOutRoot: root,
      allowedProfileRoot: profRoot,
    });
    const deadline = Date.now() + 15_000;
    for (;;) {
      const st = supervisor.getStatus();
      if (st.state === 'idle' || st.state === 'error') return st;
      if (Date.now() > deadline) throw new Error(`timed out in state ${st.state}`);
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  it('surfaces CLI failure as error state with cause and writes no empty CSV', async () => {
    const st = await runToFinal(
      `console.error('[cli] collect failed: page.evaluate: Execution context was destroyed'); process.exit(1);`,
    );
    expect(st.state).toBe('error');
    expect(st.message).toMatch(/collect failed/);
    expect(st.message).toMatch(/exit 1/);
    expect(st.csvPath).toBeUndefined();
    expect(existsSync(join(st.outDir!, 'results.csv'))).toBe(false);
  }, 20_000);

  it('treats clean exit with results as idle and exports CSV', async () => {
    const st = await runToFinal(`
      const fs = require('node:fs');
      const out = process.argv[process.argv.indexOf('--out') + 1];
      fs.writeFileSync(out + '/results.jsonl', JSON.stringify({
        domain: 'acme.com', name: 'Acme', websiteUrl: 'https://acme.com', finalUrl: 'https://acme.com',
        loadStatus: 'ok', verdict: 'none', confidence: 'high',
        evidence: { linkHits: [], platformHits: [], pathHits: [] },
        scannedAt: new Date().toISOString(), detectorVersion: 'test',
      }) + '\\n');
    `);
    expect(st.state).toBe('idle');
    expect(st.counts.false).toBe(1);
    expect(st.csvPath).toBeTruthy();
    expect(existsSync(st.csvPath!)).toBe(true);
  }, 20_000);

  it('exit without output still reports error state', async () => {
    const st = await runToFinal(`process.exit(2);`);
    expect(st.state).toBe('error');
    expect(st.message).toMatch(/exit 2/);
    expect(existsSync(join(st.outDir!, 'results.csv'))).toBe(false);
  }, 20_000);

  it('reports the real crash line, not the Node.js version footer', async () => {
    const st = await runToFinal(
      `console.error("node:internal/modules/package_json_reader:314");` +
        `console.error("  throw new ERR_MODULE_NOT_FOUND(packageName, fileURLToPath(base), null);");` +
        `console.error("");` +
        `console.error("Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'p-limit' imported from cli/index.js");` +
        `console.error("Node.js v22.21.1");` +
        `process.exit(1);`,
    );
    expect(st.state).toBe('error');
    expect(st.message).toMatch(/Cannot find package 'p-limit'/);
    expect(st.message).not.toMatch(/Node\.js v/);
  }, 20_000);

  it('prefers the collect failure cause over the "no companies" symptom', async () => {
    const st = await runToFinal(
      `console.error("[cli] collect failed: Trustpilot Cloudflare challenge. Pass the check, then re-run.");` +
        `console.error("[cli] no companies to scan");` +
        `process.exit(1);`,
    );
    expect(st.state).toBe('error');
    expect(st.message).toMatch(/Cloudflare challenge/);
    expect(st.message).not.toMatch(/no companies to scan/);
  }, 20_000);
});
