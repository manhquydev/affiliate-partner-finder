/**
 * Electron renderer E2E — Playwright _electron (no full Trustpilot scan).
 * Requires: DISPLAY, Google Chrome (warning dialog if missing), Linux --no-sandbox via env.
 */
import { mkdirSync, rmSync, writeFileSync, existsSync, readdirSync, utimesSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { _electron as electron } from 'playwright';
import type { ElectronApplication, Page } from 'playwright';
import { defaultDesktopRunsDir } from '../desktop/build-scan-argv.ts';

declare global {
  interface Window {
    affiliateDesktop: {
      inspectOutDir: (path: string) => Promise<{ query?: string } | null>;
      openCsv: (out: string) => Promise<unknown>;
      openOutDir: (out: string) => Promise<{ ok?: boolean } | null>;
    };
  }
}

const repoRoot = join(import.meta.dirname, '..');
const E2E_TIMEOUT_MS = 120_000;

function launchArgs(userDataDir: string): string[] {
  return [
    join(repoRoot, 'desktop/electron-dev.cjs'),
    `--user-data-dir=${userDataDir}`,
    '--no-sandbox',
  ];
}

async function waitForRenderer(page: Page): Promise<void> {
  await page.waitForSelector('h1', { timeout: 30_000 });
  await page.waitForFunction(() => Boolean(window.affiliateDesktop), undefined, {
    timeout: 30_000,
  });
}

async function clearJobFilter(page: Page): Promise<void> {
  await page.evaluate(() => {
    const f = document.getElementById('jobFilter') as HTMLInputElement | null;
    if (f) {
      f.value = '';
      f.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
}

async function jobRow(page: Page, namePart: string) {
  await clearJobFilter(page);
  const row = page.locator('.job-table tbody tr', { hasText: namePart });
  await row.waitFor({ timeout: 15_000 });
  return row;
}

describe('desktop electron renderer e2e', () => {
  let app: ElectronApplication | undefined;
  let page: Page | undefined;
  let userDataDir: string;
  let fixtureOut: string;
  let otherFixtureOut: string;

  beforeAll(async () => {
    userDataDir = join(tmpdir(), `apf-e2e-${Date.now()}`);
    mkdirSync(userDataDir, { recursive: true });

    const runs = defaultDesktopRunsDir();
    mkdirSync(runs, { recursive: true });
    for (const name of readdirSync(runs)) {
      if (name.startsWith('e2e-fixture-') || name.startsWith('run-')) {
        rmSync(join(runs, name), { recursive: true, force: true });
      }
    }
    fixtureOut = join(runs, 'e2e-fixture-query-sync');
    mkdirSync(fixtureOut, { recursive: true });
    writeFileSync(
      join(fixtureOut, 'progress.json'),
      JSON.stringify({
        query: 'vpn',
        total: 10,
        completed: 3,
        updatedAt: new Date().toISOString(),
        earlyExit: false,
      }),
    );
    writeFileSync(join(fixtureOut, 'companies.json'), JSON.stringify([{ name: 'Acme', domain: 'acme.com' }]));

    otherFixtureOut = join(runs, 'e2e-fixture-other-job');
    mkdirSync(otherFixtureOut, { recursive: true });
    writeFileSync(
      join(otherFixtureOut, 'progress.json'),
      JSON.stringify({
        query: 'hosting',
        total: 5,
        completed: 5,
        updatedAt: new Date().toISOString(),
        earlyExit: false,
      }),
    );
    const now = Date.now() / 1000;
    utimesSync(fixtureOut, now, now);
    utimesSync(otherFixtureOut, now, now);

    app = await electron.launch({
      cwd: repoRoot,
      args: launchArgs(userDataDir),
      env: {
        ...process.env,
        ELECTRON_DISABLE_SANDBOX: '1',
      },
    });
    page = await app.firstWindow();
    await waitForRenderer(page);
    await page.waitForFunction(
      () => document.querySelectorAll('.job-table tbody tr').length >= 2,
      undefined,
      { timeout: 15_000 },
    );
  }, E2E_TIMEOUT_MS);

  afterAll(async () => {
    await app?.close();
    try {
      rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }, E2E_TIMEOUT_MS);

  it('loads Vietnamese shell without hardcoded design default', async () => {
    const title = await page!.locator('h1').textContent();
    expect(title).toContain('Trình dò Affiliate');
    expect(await page!.locator('#btnPickOut').count()).toBe(1);
    expect(await page!.locator('#progressFill').count()).toBe(1);
    const placeholder = await page!.locator('#query').getAttribute('placeholder');
    expect(placeholder).toMatch(/hosting/i);
    const value = await page!.locator('#query').inputValue();
    expect(value).not.toBe('design');
  });

  it('blocks Start when query is empty', async () => {
    await page!.locator('#query').fill('');
    await page!.locator('#btnStart').click();
    const msg = await page!.locator('#message').textContent();
    expect(msg).toMatch(/Nhập từ khoá/i);
  });

  it('shows Lấy danh sách beside Start', async () => {
    const btn = page!.locator('#btnCollectList');
    expect(await btn.isVisible()).toBe(true);
    expect((await btn.innerText()).trim()).toBe('Lấy danh sách');
    expect((await page!.locator('#btnStart').innerText()).trim()).toBe('Bắt đầu');
  });

  it('blocks Lấy danh sách when query is empty', async () => {
    await page!.locator('#query').fill('');
    await page!.locator('#btnCollectList').click();
    const msg = await page!.locator('#message').textContent();
    expect(msg).toMatch(/Nhập từ khoá/i);
  });

  it('accepts custom Trustpilot keyword input', async () => {
    await page!.locator('#query').fill('hosting');
    expect(await page!.locator('#query').inputValue()).toBe('hosting');
  });

  it('keeps Stop disabled while idle', async () => {
    expect(await page!.locator('#btnStop').isDisabled()).toBe(true);
  });

  it('keeps hide-chrome toggle visible and checked by default', async () => {
    expect(await page!.locator('#hideChromeRow').isVisible()).toBe(true);
    expect(await page!.locator('#hideChrome').isChecked()).toBe(true);
    expect(await page!.locator('#hideChromeHint').isVisible()).toBe(true);
  });

  it('keeps probe-parallel toggle visible and unchecked by default', async () => {
    expect(await page!.locator('#probeParallel').isVisible()).toBe(true);
    expect(await page!.locator('#probeParallel').isChecked()).toBe(false);
  });

  it('allows toggling probe-parallel independently of hide-chrome', async () => {
    await page!.locator('#probeParallel').check();
    expect(await page!.locator('#probeParallel').isChecked()).toBe(true);
    expect(await page!.locator('#hideChrome').isChecked()).toBe(true);
    await page!.locator('#probeParallel').uncheck();
    expect(await page!.locator('#probeParallel').isChecked()).toBe(false);
  });

  it('syncs query from existing out dir progress.json', async () => {
    await page!.evaluate(async (path) => {
      const info = await window.affiliateDesktop.inspectOutDir(path);
      (document.getElementById('out') as HTMLInputElement).value = path;
      if (info?.query) (document.getElementById('query') as HTMLInputElement).value = info.query;
    }, fixtureOut);
    expect(await page!.locator('#query').inputValue()).toBe('vpn');
  });

  it('selecting a listed job keeps that folder as Start target', async () => {
    const row = await jobRow(page!, 'e2e-fixture-query-sync');
    await row.click();
    await expect.poll(async () => page!.locator('#out').inputValue()).toContain('e2e-fixture-query-sync');
    expect(await page!.locator('#query').inputValue()).toBe('vpn');
    await page!.waitForTimeout(300);
    expect(await page!.locator('#out').inputValue()).toContain('e2e-fixture-query-sync');
    expect(await row.getAttribute('aria-selected')).toBe('true');
  });

  it('Job mới changes the Start target away from the selected run', async () => {
    const row = await jobRow(page!, 'e2e-fixture-query-sync');
    await row.click();
    await expect.poll(async () => page!.locator('#out').inputValue()).toContain('e2e-fixture-query-sync');
    await page!.locator('#btnNewOut').click();
    await expect.poll(async () => page!.locator('#out').inputValue()).not.toContain('e2e-fixture-query-sync');
    const out = await page!.locator('#out').inputValue();
    expect(out.length).toBeGreaterThan(0);
  });

  it('lets you select another job while a scan is running', async () => {
    const liveRow = await jobRow(page!, 'e2e-fixture-query-sync');
    const otherRow = await jobRow(page!, 'e2e-fixture-other-job');
    await liveRow.click();
    await expect.poll(async () => page!.locator('#out').inputValue()).toContain('e2e-fixture-query-sync');

    const runningStatus = {
      state: 'running' as const,
      progress: {
        query: 'vpn',
        total: 10,
        completed: 3,
        updatedAt: new Date().toISOString(),
        earlyExit: false,
      },
      counts: { true: 0, false: 0, unknown: 0 },
      currentDomains: ['acme.com'],
      outDir: fixtureOut,
      message: 'Đang khởi động…',
    };
    await app!.evaluate(({ BrowserWindow }, payload) => {
      const win = BrowserWindow.getAllWindows()[0];
      if (!win) throw new Error('no BrowserWindow');
      win.webContents.send('desktop:status', payload);
    }, runningStatus);

    await expect.poll(async () => page!.locator('#btnStart').isDisabled()).toBe(true);
    expect(await page!.locator('#btnCollectList').isDisabled()).toBe(true);
    expect(await page!.locator('#btnStop').isDisabled()).toBe(false);
    expect(await page!.locator('#btnNewOut').isDisabled()).toBe(false);
    expect(await page!.locator('#btnPickOut').isDisabled()).toBe(false);
    expect(await page!.locator('#liveJobNote').isHidden()).toBe(true);

    await otherRow.click();
    await expect.poll(async () => page!.locator('#out').inputValue()).toContain('e2e-fixture-other-job');
    await expect.poll(async () => page!.locator('#query').inputValue()).toBe('hosting');
    await expect.poll(async () => page!.locator('#liveJobNote').isHidden()).toBe(false);
    expect(await page!.locator('#btnStart').isDisabled()).toBe(true);
    expect(await page!.locator('#btnResume').isDisabled()).toBe(true);
    expect(await page!.locator('#btnCollectList').isDisabled()).toBe(true);
    expect(await page!.locator('#btnStop').isDisabled()).toBe(false);
    expect(await page!.locator('#btnNewOut').isDisabled()).toBe(false);
    expect(await page!.locator('#liveJobName').textContent()).toContain('e2e-fixture-query-sync');
    expect(await page!.locator('#query').getAttribute('readonly')).toBeNull();
    expect(await otherRow.getAttribute('aria-selected')).toBe('true');

    await liveRow.click();
    await expect.poll(async () => page!.locator('#out').inputValue()).toContain('e2e-fixture-query-sync');
    await expect.poll(async () => page!.locator('#liveJobNote').isHidden()).toBe(true);
    await expect.poll(async () => page!.locator('#query').getAttribute('readonly')).not.toBeNull();

    await otherRow.click();
    await expect.poll(async () => page!.locator('#out').inputValue()).toContain('e2e-fixture-other-job');

    await app!.evaluate(({ BrowserWindow }, payload) => {
      const win = BrowserWindow.getAllWindows()[0];
      if (!win) throw new Error('no BrowserWindow');
      win.webContents.send('desktop:status', payload);
    }, {
      state: 'idle',
      progress: null,
      counts: { true: 0, false: 0, unknown: 0 },
      currentDomains: [],
      outDir: fixtureOut,
    });
    await expect.poll(async () => page!.locator('#out').inputValue()).toContain('e2e-fixture-other-job');
  });

  it('openCsv and openOutDir use explicit out path via IPC', async () => {
    const csvPath = join(otherFixtureOut, 'results.csv');
    writeFileSync(csvPath, 'ten_cong_ty,website,ket_qua,huong_dan\nAcme,https://acme.com,true,\n');
    await app!.evaluate(({ shell }) => {
      shell.openPath = async (p: string) => p;
    });
    await page!.evaluate((out) => {
      const el = document.getElementById('out') as HTMLInputElement;
      el.value = out;
    }, otherFixtureOut);
    const csvErr = await page!.evaluate(async (out) => {
      try {
        await window.affiliateDesktop!.openCsv(out);
        return '';
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
    }, otherFixtureOut);
    expect(csvErr).toBe('');
    const folder = await page!.evaluate(async (out) => {
      const res = await window.affiliateDesktop!.openOutDir(out);
      return res?.ok === true;
    }, otherFixtureOut);
    expect(folder).toBe(true);
  });
});

describe('desktop packaged linux smoke', () => {
  const unpackedDir = join(repoRoot, 'dist-desktop/linux-unpacked');
  const execCandidates = [
    join(unpackedDir, 'affiliate-partner-finder'),
    join(unpackedDir, 'Affiliate Partner Finder'),
  ];
  const execPath = execCandidates.find((p) => existsSync(p));

  it.skipIf(!execPath)('packaged AppImage/unpacked binary opens renderer', async () => {
    const userDataDir = join(tmpdir(), `apf-pack-e2e-${Date.now()}`);
    mkdirSync(userDataDir, { recursive: true });
    const app = await electron.launch({
      executablePath: execPath!,
      args: [`--user-data-dir=${userDataDir}`, '--no-sandbox'],
      env: { ...process.env, ELECTRON_DISABLE_SANDBOX: '1' },
    });
    try {
      const win = await app.firstWindow();
      await waitForRenderer(win);
      expect(await win.locator('#query').isVisible()).toBe(true);
    } finally {
      await app.close();
      rmSync(userDataDir, { recursive: true, force: true });
    }
  }, E2E_TIMEOUT_MS);
});
