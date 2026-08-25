// Playwright browser helpers for local CLI (collect + scan).

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { hideChromeWindowArgs, hidePlaywrightWindows } from './hide-chrome-window';

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
function headedContextOptions(hideWindows: boolean): {
  headless: false;
  viewport: { width: number; height: number };
  args?: string[];
} {
  return {
    headless: false,
    viewport: { width: 1280, height: 800 },
    ...(hideWindows ? { args: hideChromeWindowArgs() } : {}),
  };
}

export async function launchPersistentCollect(
  profileDir = DEFAULT_PROFILE_DIR,
  opts?: { hideWindows?: boolean },
): Promise<BrowserHandle> {
  mkdirSync(profileDir, { recursive: true });
  const hideWindows = Boolean(opts?.hideWindows);
  const common = headedContextOptions(hideWindows);
  try {
    const context = await chromium.launchPersistentContext(profileDir, {
      channel: 'chrome',
      ...common,
    });
    if (hideWindows) await hidePlaywrightWindows(context);
    return { browser: null, context, persistent: true };
  } catch (e) {
    console.warn(
      `[cli] system Chrome launch failed (${e instanceof Error ? e.message.split('\n')[0] : e}) — using bundled Chromium (CF pass-rate may be lower)`,
    );
    const context = await chromium.launchPersistentContext(profileDir, common);
    if (hideWindows) await hidePlaywrightWindows(context);
    return { browser: null, context, persistent: true };
  }
}

/** Shared browser for concurrent site scans (fresh contexts per company). */
export async function launchScanBrowser(headed = false, hideWindows = false): Promise<Browser> {
  const args = headed && hideWindows ? hideChromeWindowArgs() : undefined;
  try {
    return await chromium.launch({ channel: 'chrome', headless: !headed, args });
  } catch {
    return await chromium.launch({ headless: !headed, args });
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
  /** Headed but off primary display (Windows/macOS). Linux uses Xvfb instead. */
  hideWindows?: boolean;
}): Promise<ScanSession> {
  const headed = Boolean(opts.headed);
  const hideWindows = Boolean(headed && opts.hideWindows);
  if (opts.profileDir) {
    mkdirSync(opts.profileDir, { recursive: true });
    let context: BrowserContext;
    const common = {
      headless: !headed,
      viewport: { width: 1280, height: 800 },
      ...(hideWindows ? { args: hideChromeWindowArgs() } : {}),
    };
    try {
      context = await chromium.launchPersistentContext(opts.profileDir, {
        channel: 'chrome',
        ...common,
      });
    } catch (e) {
      console.warn(
        `[cli] system Chrome launch failed for scan-profile (${e instanceof Error ? e.message.split('\n')[0] : e}) — bundled Chromium`,
      );
      context = await chromium.launchPersistentContext(opts.profileDir, common);
    }
    if (hideWindows) await hidePlaywrightWindows(context);
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

  const browser = await launchScanBrowser(headed, hideWindows);
  return {
    mode: 'ephemeral',
    openPage: async () => {
      const context = await newScanContext(browser);
      if (hideWindows) await hidePlaywrightWindows(context);
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

/** Fixed settle used when `--lazy-settle` is OFF (today's CLI path). */
export const DEFAULT_SETTLE_MS = 1200;

/**
 * Hard wall for MutationObserver + scroll settle when `--lazy-settle` is ON.
 * Replaces DEFAULT_SETTLE_MS — never stacks. Cap ≤1200ms (A7 > A6).
 */
export const DEFAULT_LAZY_SETTLE_BUDGET_MS = 1200;

/** Total scroll distance (px) across settleLazy steps. */
export const DEFAULT_LAZY_SETTLE_SCROLL_PX = 800;

/** Quiet window after last DOM mutation before early exit (ms). */
export const DEFAULT_LAZY_SETTLE_QUIET_MS = 150;

export type LazySettleOptions = {
  /** Settle wall; clamped to ≤ DEFAULT_LAZY_SETTLE_BUDGET_MS. */
  budgetMs?: number;
  scrollPx?: number;
  quietMs?: number;
  /** Remaining per-company scan wall; hard-stop = min(budget, remaining). */
  remainingScanBudgetMs?: number;
};

/**
 * Pure budget resolver — unit-testable.
 * Prefer throughput (A7): never exceed maxMs or remaining scan budget.
 */
export function resolveLazySettleBudgetMs(
  requestedMs?: number,
  remainingScanBudgetMs?: number,
  maxMs = DEFAULT_LAZY_SETTLE_BUDGET_MS,
): number {
  const raw = requestedMs == null || !Number.isFinite(requestedMs) ? maxMs : requestedMs;
  let budget = Math.min(maxMs, Math.max(0, Math.trunc(raw)));
  if (remainingScanBudgetMs != null && Number.isFinite(remainingScanBudgetMs)) {
    budget = Math.min(budget, Math.max(0, Math.trunc(remainingScanBudgetMs)));
  }
  return budget;
}

export async function settle(page: Page, ms = 700): Promise<void> {
  await page.waitForTimeout(ms);
}

/**
 * Scroll + MutationObserver settle under a hard time budget.
 * Intended to **replace** `settle(page, 1200)` when `--lazy-settle` is on — do not call both.
 */
export async function settleLazy(page: Page, opts: LazySettleOptions = {}): Promise<void> {
  const budgetMs = resolveLazySettleBudgetMs(opts.budgetMs, opts.remainingScanBudgetMs);
  if (budgetMs <= 0) return;

  const scrollPx = opts.scrollPx ?? DEFAULT_LAZY_SETTLE_SCROLL_PX;
  const quietMs = opts.quietMs ?? DEFAULT_LAZY_SETTLE_QUIET_MS;
  const started = Date.now();

  const inPage = page.evaluate(
    async ({ budgetMs: budget, scrollPx: scroll, quietMs: quiet }) => {
      const deadline = performance.now() + budget;
      const remaining = () => Math.max(0, deadline - performance.now());

      const sleep = (ms: number) =>
        new Promise<void>((resolve) => {
          setTimeout(resolve, ms);
        });

      // Short scroll to trigger lazy widgets; never overrun budget.
      const steps = 3;
      const stepPx = Math.max(1, Math.floor(scroll / steps));
      for (let i = 0; i < steps && remaining() > 0; i++) {
        window.scrollBy(0, stepPx);
        await sleep(Math.min(40, remaining()));
      }
      if (remaining() > 0) {
        window.scrollTo(0, 0);
      }

      // Wait for quiet DOM or budget exhaustion.
      await new Promise<void>((resolve) => {
        let lastMutation = performance.now();
        const obs = new MutationObserver(() => {
          lastMutation = performance.now();
        });
        try {
          obs.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: false,
          });
        } catch {
          resolve();
          return;
        }

        const tick = () => {
          const now = performance.now();
          if (now >= deadline || now - lastMutation >= quiet) {
            obs.disconnect();
            resolve();
            return;
          }
          setTimeout(tick, Math.min(50, Math.max(1, deadline - now)));
        };
        setTimeout(tick, Math.min(50, Math.max(1, remaining())));
      });
    },
    { budgetMs, scrollPx, quietMs },
  );

  // Node-side hard wall — evaluate must not exceed budget even if page JS stalls.
  const elapsed = Date.now() - started;
  const wall = Math.max(0, budgetMs - elapsed);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      inPage.catch(() => undefined),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, wall);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export type SettleForScanOptions = {
  /** When true, use settleLazy; when false/undefined, fixed settle. Default OFF. */
  lazySettle?: boolean;
  lazySettleBudgetMs?: number;
  remainingScanBudgetMs?: number;
};

/**
 * Single settle entry for CLI scan — never stacks lazy + fixed timeout.
 */
export async function settleForScan(page: Page, opts: SettleForScanOptions = {}): Promise<void> {
  if (opts.lazySettle) {
    await settleLazy(page, {
      budgetMs: opts.lazySettleBudgetMs ?? DEFAULT_LAZY_SETTLE_BUDGET_MS,
      remainingScanBudgetMs: opts.remainingScanBudgetMs,
    });
    return;
  }
  await settle(page, DEFAULT_SETTLE_MS);
}
