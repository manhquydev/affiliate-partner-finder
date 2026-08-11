// Playwright browser helpers for local CLI (collect + scan).

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

export const DEFAULT_PROFILE_DIR = join(homedir(), '.cache', 'affiliate-partner-finder', 'chrome-profile');

/** Default max wait when closing a Playwright page/context/browser. */
export const DEFAULT_CLOSE_TIMEOUT_MS = 3_000;

export type BrowserHandle = {
  browser: Browser | null;
  context: BrowserContext;
  persistent: boolean;
};

export type Closable = { close: () => Promise<unknown> };

/** Never hang forever on Playwright close (page/context/browser). */
export async function closeQuietly(
  target: Closable | null | undefined,
  ms = DEFAULT_CLOSE_TIMEOUT_MS,
): Promise<void> {
  if (!target) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      target.close().catch(() => undefined),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

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

/**
 * Session for site scans: either ephemeral browser (fresh context/page per company)
 * or persistent CF profile (shared context, new page per company).
 */
export type ScanSession = {
  mode: 'ephemeral' | 'profile';
  profileDir?: string;
  /** Open a page for one company. Caller must closeQuietly(page). */
  openPage: () => Promise<{ page: Page; context?: BrowserContext }>;
  /** Register fatal disconnect/close handler (ignored after intentional shutdown). */
  bindDisconnect: (fn: () => void) => void;
  /** Shut down browser/context. Safe with closeQuietly. */
  close: () => Promise<void>;
};

export async function launchScanSession(opts: {
  headed?: boolean;
  /** When set, use persistent Chrome profile (CF cookies) for site scans. */
  profileDir?: string;
}): Promise<ScanSession> {
  const headed = Boolean(opts.headed);
  if (opts.profileDir) {
    mkdirSync(opts.profileDir, { recursive: true });
    let context: BrowserContext;
    try {
      context = await chromium.launchPersistentContext(opts.profileDir, {
        channel: 'chrome',
        headless: !headed,
        viewport: { width: 1280, height: 800 },
      });
    } catch {
      console.warn('[cli] system Chrome unavailable for scan-profile — bundled Chromium');
      context = await chromium.launchPersistentContext(opts.profileDir, {
        headless: !headed,
        viewport: { width: 1280, height: 800 },
      });
    }
    // Keep at least one window open — closing the last Chrome window exits the
    // persistent profile process and fires context 'close' (false disconnect).
    let keepAlive = context.pages()[0];
    if (!keepAlive) keepAlive = await context.newPage();
    await keepAlive.goto('about:blank').catch(() => undefined);
    for (const p of context.pages()) {
      if (p !== keepAlive) await closeQuietly(p, DEFAULT_CLOSE_TIMEOUT_MS);
    }
    return {
      mode: 'profile',
      profileDir: opts.profileDir,
      openPage: async () => ({ page: await context.newPage() }),
      bindDisconnect: (fn) => {
        context.on('close', fn);
      },
      close: async () => {
        for (const p of context.pages()) {
          await closeQuietly(p, DEFAULT_CLOSE_TIMEOUT_MS);
        }
        await closeQuietly(context, DEFAULT_CLOSE_TIMEOUT_MS);
      },
    };
  }

  const browser = await launchScanBrowser(headed);
  return {
    mode: 'ephemeral',
    openPage: async () => {
      const context = await newScanContext(browser);
      const page = await context.newPage();
      return { page, context };
    },
    bindDisconnect: (fn) => {
      browser.on('disconnected', fn);
    },
    close: async () => {
      await closeQuietly(browser, DEFAULT_CLOSE_TIMEOUT_MS);
    },
  };
}

export async function closeHandle(h: BrowserHandle): Promise<void> {
  await closeQuietly(h.context, DEFAULT_CLOSE_TIMEOUT_MS);
  if (h.browser) await closeQuietly(h.browser, DEFAULT_CLOSE_TIMEOUT_MS);
}

export async function settle(page: Page, ms = 700): Promise<void> {
  await page.waitForTimeout(ms);
}
