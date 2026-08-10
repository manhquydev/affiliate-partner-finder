// Playwright browser helpers for local CLI (collect + scan).

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

export const DEFAULT_PROFILE_DIR = join(homedir(), '.cache', 'affiliate-partner-finder', 'chrome-profile');

export type BrowserHandle = {
  browser: Browser | null;
  context: BrowserContext;
  persistent: boolean;
};

/** Launch options: prefer system Chrome for Trustpilot CF; fall back to Chromium. */
export async function launchPersistentCollect(profileDir = DEFAULT_PROFILE_DIR): Promise<BrowserHandle> {
  mkdirSync(profileDir, { recursive: true });
  try {
    const context = await chromium.launchPersistentContext(profileDir, {
      channel: 'chrome',
      headless: false,
      viewport: { width: 1280, height: 800 },
    });
    return { browser: null, context, persistent: true };
  } catch {
    console.warn('[cli] system Chrome unavailable — using bundled Chromium (CF pass-rate may be lower)');
    const context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      viewport: { width: 1280, height: 800 },
    });
    return { browser: null, context, persistent: true };
  }
}

/** Shared browser for concurrent site scans (fresh contexts per company). */
export async function launchScanBrowser(headed = false): Promise<Browser> {
  try {
    return await chromium.launch({ channel: 'chrome', headless: !headed });
  } catch {
    return await chromium.launch({ headless: !headed });
  }
}

export async function newScanContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'en-US',
    // Asset abort OFF by default (parity with extension observation set).
  });
}

export async function closeHandle(h: BrowserHandle): Promise<void> {
  await h.context.close().catch(() => undefined);
  if (h.browser) await h.browser.close().catch(() => undefined);
}

export async function settle(page: Page, ms = 700): Promise<void> {
  await page.waitForTimeout(ms);
}
