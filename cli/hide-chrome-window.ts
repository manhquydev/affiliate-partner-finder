/** Headed Chrome that does not seize the primary display (Windows/macOS). */

import type { BrowserContext, Page } from 'playwright';

/** Far off-screen so multi-monitor setups still do not show the window. */
const OFFSCREEN = -32_000;

export function hideChromeWindowArgs(platform: NodeJS.Platform = process.platform): string[] {
  const args = [`--window-position=${OFFSCREEN},${OFFSCREEN}`, '--window-size=1280,800'];
  if (platform === 'win32') args.push('--start-minimized');
  return args;
}

/** True when --virtual-display should re-exec via xvfb-run (Linux only). */
export function shouldReexecUnderXvfb(
  enabled: boolean,
  platform: NodeJS.Platform,
  alreadyUnder: boolean,
): boolean {
  return enabled && platform === 'linux' && !alreadyUnder;
}

/** True when headed Chrome should be minimized/off-screen in-process (no Xvfb). */
export function shouldHideChromeWindows(
  enabled: boolean,
  platform: NodeJS.Platform,
): boolean {
  return enabled && platform !== 'linux';
}

export async function hidePlaywrightWindows(context: BrowserContext): Promise<void> {
  const hidePage = async (page: Page) => {
    try {
      const session = await context.newCDPSession(page);
      const { windowId } = await session.send('Browser.getWindowForTarget');
      await session.send('Browser.setWindowBounds', {
        windowId,
        bounds: { windowState: 'minimized' },
      });
    } catch {
      /* target closed or CDP unavailable */
    }
  };

  for (const page of context.pages()) {
    await hidePage(page);
  }
  context.on('page', (page) => {
    void hidePage(page);
  });
}
