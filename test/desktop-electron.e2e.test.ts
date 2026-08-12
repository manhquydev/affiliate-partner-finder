/**
 * Electron renderer E2E — Playwright _electron (no full Trustpilot scan).
 * Requires: DISPLAY, Google Chrome (warning dialog if missing), Linux --no-sandbox via env.
 */
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { _electron as electron } from 'playwright';
import type { ElectronApplication, Page } from 'playwright';
import { defaultDesktopRunsDir } from '../desktop/build-scan-argv.ts';

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

describe('desktop electron renderer e2e', () => {
  let app: ElectronApplication | undefined;
  let page: Page | undefined;
  let userDataDir: string;
  let fixtureOut: string;

  beforeAll(async () => {
    userDataDir = join(tmpdir(), `apf-e2e-${Date.now()}`);
    mkdirSync(userDataDir, { recursive: true });

    const runs = defaultDesktopRunsDir();
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

  it('accepts custom Trustpilot keyword input', async () => {
    await page!.locator('#query').fill('hosting');
    expect(await page!.locator('#query').inputValue()).toBe('hosting');
  });

  it('keeps Stop disabled while idle', async () => {
    expect(await page!.locator('#btnStop').isDisabled()).toBe(true);
  });

  it('syncs query from existing out dir progress.json', async () => {
    await page!.locator('#query').fill('');
    await page!.locator('#out').fill(fixtureOut);
    await page!.locator('#out').dispatchEvent('change');
    await page!.waitForFunction(
      () => document.getElementById('query')?.value === 'vpn',
      undefined,
      { timeout: 5000 },
    );
    expect(await page!.locator('#query').inputValue()).toBe('vpn');
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
