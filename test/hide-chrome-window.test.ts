import { describe, expect, it } from 'vitest';
import {
  hideChromeWindowArgs,
  shouldHideChromeWindows,
  shouldReexecUnderXvfb,
} from '../cli/hide-chrome-window';

describe('hide-chrome-window', () => {
  it('win32 args are headed off-screen and start minimized', () => {
    const args = hideChromeWindowArgs('win32');
    expect(args).toContain('--window-position=-32000,-32000');
    expect(args).toContain('--window-size=1280,800');
    expect(args).toContain('--start-minimized');
  });

  it('darwin args are off-screen without start-minimized', () => {
    const args = hideChromeWindowArgs('darwin');
    expect(args).toContain('--window-position=-32000,-32000');
    expect(args).not.toContain('--start-minimized');
  });

  it('xvfb re-exec is linux-only', () => {
    expect(shouldReexecUnderXvfb(true, 'linux', false)).toBe(true);
    expect(shouldReexecUnderXvfb(true, 'linux', true)).toBe(false);
    expect(shouldReexecUnderXvfb(true, 'win32', false)).toBe(false);
    expect(shouldReexecUnderXvfb(false, 'linux', false)).toBe(false);
  });

  it('in-process window hide is non-linux only', () => {
    expect(shouldHideChromeWindows(true, 'win32')).toBe(true);
    expect(shouldHideChromeWindows(true, 'darwin')).toBe(true);
    expect(shouldHideChromeWindows(true, 'linux')).toBe(false);
    expect(shouldHideChromeWindows(false, 'win32')).toBe(false);
  });
});
