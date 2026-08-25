import { homedir } from 'node:os';
import { join } from 'node:path';
import type { JobOptions } from './types.ts';

const MIN_DELAY_MS = 1000;
const MAX_CONCURRENCY = 3;

/**
 * Xvfb / --virtual-display is Linux-only.
 * Default ON on Linux so the desktop GUI does not seize the primary display.
 * Always off on Windows/macOS — even if a caller (or hidden checkbox) sends true.
 */
export function resolveVirtualDisplay(
  platform: NodeJS.Platform,
  requested?: boolean,
): boolean {
  return platform === 'linux' && requested !== false;
}

export function clampConcurrency(n: number | undefined): number {
  const v = Number.isFinite(n) ? Math.trunc(n as number) : 2;
  return Math.min(MAX_CONCURRENCY, Math.max(1, v));
}

export function clampDelayMs(n: number | undefined): number {
  const v = Number.isFinite(n) ? Math.trunc(n as number) : 1500;
  return Math.max(MIN_DELAY_MS, v);
}

/**
 * Build CLI argv (without node/tsx executable).
 * Always array-safe — never shell-concatenate.
 */
export function buildScanArgv(opts: JobOptions): string[] {
  const platform = opts.platform ?? process.platform;
  const concurrency = clampConcurrency(opts.concurrency);
  const delayMs = clampDelayMs(opts.delayMs);
  const scanProfile = opts.scanProfile !== false;
  const acceptFailures = opts.acceptFailures !== false;

  const args: string[] = ['--out', opts.out, '--profile', opts.profile];

  if (opts.resume) {
    args.push('--resume');
  } else {
    if (!opts.query?.trim()) {
      throw new Error('query is required when not resuming');
    }
    args.push('--query', opts.query.trim());
    if (opts.limit != null) args.push('--limit', String(Math.max(1, Math.trunc(opts.limit))));
  }

  if (opts.maxPages != null) args.push('--max-pages', String(Math.max(1, Math.trunc(opts.maxPages))));
  args.push('--concurrency', String(concurrency));
  args.push('--delay-ms', String(delayMs));

  if (scanProfile) args.push('--scan-profile');
  if (acceptFailures) args.push('--accept-failures');
  if (opts.earlyExit) args.push('--early-exit');
  // Default OFF — only pass when explicitly enabled (A7: do not regress throughput).
  if (opts.lazySettle) args.push('--lazy-settle');
  // Default OFF — network classify behind flag until operator opts in.
  if (opts.networkEvidence) args.push('--network-evidence');

  if (resolveVirtualDisplay(platform, opts.virtualDisplay)) {
    args.push('--virtual-display');
  }

  if (platform === 'win32' && !args.includes('--profile')) {
    throw new Error('Windows desktop jobs must pass --profile');
  }

  return args;
}

export function defaultDesktopProfileDir(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): string {
  if (platform === 'win32') {
    const base = env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local');
    return join(base, 'affiliate-partner-finder', 'chrome-profile');
  }
  return join(homedir(), '.cache', 'affiliate-partner-finder', 'chrome-profile-desktop');
}

export function defaultDesktopRunsDir(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): string {
  if (platform === 'win32') {
    const docs = env.USERPROFILE ? join(env.USERPROFILE, 'Documents') : join(homedir(), 'Documents');
    return join(docs, 'AffiliatePartnerFinder', 'runs');
  }
  return join(homedir(), 'AffiliatePartnerFinder', 'runs');
}
