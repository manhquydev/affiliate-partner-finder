import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('profile scan isolation (regression locks)', () => {
  it('openPage uses context.newPage(), not keepAlive reuse', () => {
    const browser = src('cli/browser.ts');
    expect(browser).toMatch(/keepAlive\.goto\(\s*['"]about:blank['"]\s*\)/);
    expect(browser).toMatch(/if\s*\(\s*p\s*!==\s*keepAlive\s*\)/);
    expect(browser).toMatch(
      /openPage:\s*async\s*\(\)\s*=>\s*\(\{\s*page:\s*await\s*context\.newPage\(\)/,
    );
    expect(browser).not.toMatch(/page:\s*keepAlive/);
    expect(browser).not.toMatch(/page\s*=\s*keepAlive/);
    expect(browser).not.toMatch(/return\s*\{\s*page:\s*keepAlive/);
  });

  it('scanOneCli always closeQuietly(page) — no profile skip-close', () => {
    const scan = src('cli/scan.ts');
    const scanOne = scan.slice(scan.indexOf('export async function scanOneCli'));
    expect(scanOne).toMatch(/finally\s*\{\s*await closeQuietly\(page/);
    expect(scanOne).not.toMatch(/keepAlive/);
    // Historical bug: if (session.mode !== 'profile') closeQuietly(page)
    expect(scanOne).not.toMatch(/mode\s*!==\s*['"]profile['"]/);
    expect(scanOne).not.toMatch(/mode\s*===\s*['"]profile['"]/);
    expect(scan).not.toMatch(/mode\s*===\s*['"]profile['"][\s\S]{0,160}skip/i);
  });

  it('in-flight company scans and probe batches clamp to ≤3', () => {
    const cli = src('cli/index.ts');
    const desktop = src('desktop/build-scan-argv.ts');
    const probe = src('lib/path-probe.ts');
    const batch = src('lib/probe-batch.ts');

    expect(cli).toMatch(/concurrency:\s*2/);
    expect(cli).toMatch(
      /--concurrency['"]\)\s*args\.concurrency\s*=\s*Math\.min\(\s*3\s*,\s*Math\.max\(\s*1\s*,/,
    );
    expect(cli).toMatch(/pLimit\(\s*args\.concurrency\s*\)/);
    expect(cli).not.toMatch(/pLimit\(\s*[4-9]\s*\)/);
    expect(cli).not.toMatch(/pLimit\(\s*[1-9]\d+\s*\)/);

    expect(desktop).toMatch(/MAX_CONCURRENCY\s*=\s*3/);
    expect(desktop).toMatch(/Math\.min\(\s*MAX_CONCURRENCY/);

    expect(probe).toMatch(
      /batch\s*=\s*Math\.max\(\s*1\s*,\s*Math\.min\(\s*3\s*,\s*Math\.trunc\(parallelBatch\)/,
    );
    expect(batch).toMatch(/Math\.min\(\s*3\s*,\s*Math\.max\(\s*1\s*,\s*n\s*\)\)/);
  });

  it('scan start stagger is first-wave only (not index × delay over pending)', () => {
    const cli = src('cli/index.ts');
    expect(cli).toMatch(/firstWaveStaggerMs\(\s*i\s*,\s*args\.concurrency\s*,\s*args\.delayMs\s*\)/);
    expect(cli).not.toMatch(/sleep\(\s*i\s*\*\s*Math\.min\(\s*args\.delayMs/);
  });

  it('persistent profile waits for unlock before launch (handoff)', () => {
    const browser = src('cli/browser.ts');
    expect(browser).toMatch(/waitUntilProfileUnlocked\(/);
    expect(browser).not.toMatch(/unlinkSync\([^)]*SingletonLock/);
  });

  it('goto catch classifies via classifyNavFailure (not all-timeout)', () => {
    const scan = src('cli/scan.ts');
    expect(scan).toMatch(/classifyNavFailure\(/);
    expect(scan).toMatch(/BrowserDeadError/);
    const gotoCatch = scan.slice(scan.indexOf('page.goto'), scan.indexOf('settleForScan'));
    expect(gotoCatch).not.toMatch(/catch\s*\{\s*result\.loadStatus = 'timeout'/);
  });
});
