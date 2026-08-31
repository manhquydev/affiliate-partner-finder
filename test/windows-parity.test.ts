import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  hideChromeWindowArgs,
  shouldHideChromeWindows,
  shouldReexecUnderXvfb,
} from '../cli/hide-chrome-window';
import { PROFILE_LOCK_NAMES } from '../cli/profile-lock';
import { firstWaveStaggerMs } from '../cli/scan-stagger';
import { classifyNavFailure } from '../cli/nav-failure';
import {
  buildScanArgv,
  defaultDesktopProfileDir,
  defaultDesktopRunsDir,
  resolveVirtualDisplay,
} from '../desktop/build-scan-argv';
import { assertSafeJobPaths } from '../desktop/progress';
import { assertSafeProfilePath } from '../lib/safe-paths';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const WIN_OUT = 'C:\\Users\\Alice Smith\\Documents\\AffiliatePartnerFinder\\runs\\job-1';
const WIN_PROFILE = 'C:\\Users\\Alice Smith\\AppData\\Local\\affiliate-partner-finder\\chrome-profile';
const WIN_USER_DATA = 'C:\\Users\\Alice Smith\\AppData\\Local\\Google\\Chrome\\User Data';

describe('windows-parity — hide Chrome (no Xvfb)', () => {
  it('win32 never re-execs under xvfb-run', () => {
    expect(shouldReexecUnderXvfb(true, 'win32', false)).toBe(false);
    expect(shouldHideChromeWindows(true, 'win32')).toBe(true);
  });

  it('win32 hide args are off-screen + start-minimized', () => {
    const args = hideChromeWindowArgs('win32');
    expect(args).toEqual([
      '--window-position=-32000,-32000',
      '--window-size=1280,800',
      '--start-minimized',
    ]);
  });
});

describe('windows-parity — desktop paths and argv', () => {
  it('uses LOCALAPPDATA + Documents, never personal User Data', () => {
    const profile = defaultDesktopProfileDir(
      { LOCALAPPDATA: 'C:\\Users\\Alice Smith\\AppData\\Local' },
      'win32',
    );
    const runs = defaultDesktopRunsDir({ USERPROFILE: 'C:\\Users\\Alice Smith' }, 'win32');
    expect(profile.replace(/\\/g, '/')).toBe(
      'C:/Users/Alice Smith/AppData/Local/affiliate-partner-finder/chrome-profile',
    );
    expect(runs.replace(/\\/g, '/')).toBe(
      'C:/Users/Alice Smith/Documents/AffiliatePartnerFinder/runs',
    );
    expect(profile.toLowerCase()).not.toContain('google/chrome/user data');
    expect(profile.toLowerCase()).not.toContain('google\\chrome\\user data');
  });

  it('rejects Windows Chrome User Data as a scan profile', () => {
    expect(() => assertSafeProfilePath(WIN_USER_DATA)).toThrow(/User Data/);
    expect(() =>
      assertSafeJobPaths({
        out: WIN_OUT,
        profile: WIN_USER_DATA,
      }),
    ).toThrow(/User Data/);
  });

  it('keeps spaces in win32 paths as single argv elements (shell:false contract)', () => {
    const args = buildScanArgv({
      query: 'design',
      out: WIN_OUT,
      profile: WIN_PROFILE,
      platform: 'win32',
    });
    expect(args).toContain(WIN_OUT);
    expect(args).toContain(WIN_PROFILE);
    expect(args.some((a) => a === 'Alice' || a === 'Smith')).toBe(false);
    const outIdx = args.indexOf('--out');
    expect(args[outIdx + 1]).toBe(WIN_OUT);
  });

  it('win32 default hide-chrome ON, probe-parallel OFF, scan-profile ON', () => {
    expect(resolveVirtualDisplay('win32')).toBe(true);
    const args = buildScanArgv({
      query: 'hosting',
      out: WIN_OUT,
      profile: WIN_PROFILE,
      platform: 'win32',
    });
    expect(args).toContain('--virtual-display');
    expect(args).toContain('--scan-profile');
    expect(args).not.toContain('--probe-parallel');
    expect(args[args.indexOf('--concurrency') + 1]).toBe('2');
  });
});

describe('windows-parity — Chrome profile lock names', () => {
  it('waits on the same Singleton* files Chrome writes on Windows', () => {
    expect(PROFILE_LOCK_NAMES).toEqual(['SingletonLock', 'SingletonSocket', 'SingletonCookie']);
  });
});

describe('windows-parity — scan handoff helpers (OS-agnostic, Windows-critical)', () => {
  it('first-wave stagger does not scale with pending=200', () => {
    expect(firstWaveStaggerMs(199, 2, 1500)).toBe(0);
    expect(firstWaveStaggerMs(1, 2, 1500)).toBe(500);
  });

  it('classifies a dead browser separately from a page timeout', () => {
    expect(classifyNavFailure(new Error('Target page, context or browser has been closed'))).toBe(
      'dead',
    );
    expect(classifyNavFailure(new Error('Timeout 30000ms exceeded'))).toBe('timeout');
  });
});

describe('windows-parity — source locks', () => {
  it('desktop spawn stays shell:false', () => {
    const src = readFileSync(join(root, 'desktop/job-supervisor.ts'), 'utf8');
    expect(src).toMatch(/shell:\s*false/);
    expect(src).not.toMatch(/shell:\s*true/);
  });

  it('#probeParallel stays unchecked', () => {
    const html = readFileSync(join(root, 'desktop/renderer/index.html'), 'utf8');
    expect(html).toMatch(/id="probeParallel"/);
    expect(html).not.toMatch(/id="probeParallel"[^>]*checked/);
  });
});
