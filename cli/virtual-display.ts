// Optional re-exec under Xvfb so headed Chrome does not seize the primary display.

import { spawnSync } from 'node:child_process';
import { accessSync, constants } from 'node:fs';

export const XVFB_MARKER = 'AFFILIATE_FINDER_UNDER_XVFB';

const DEFAULT_SERVER_ARGS = '-screen 0 1280x800x24';

function xvfbRunPath(): string | null {
  for (const candidate of ['/usr/bin/xvfb-run', '/bin/xvfb-run']) {
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      /* try next */
    }
  }
  return null;
}

/** True when this process was already started via --virtual-display re-exec. */
export function isUnderVirtualDisplay(): boolean {
  return process.env[XVFB_MARKER] === '1';
}

/**
 * Build xvfb-run argv. Must forward Node execArgv (tsx --import/--require)
 * or `tsx cli/index.ts` becomes a bare ESM load and crashes.
 */
export function buildXvfbChildArgs(opts: {
  execPath: string;
  execArgv: readonly string[];
  argv: readonly string[];
  serverArgs?: string;
}): string[] {
  return [
    '-a',
    `--server-args=${opts.serverArgs ?? DEFAULT_SERVER_ARGS}`,
    opts.execPath,
    ...opts.execArgv,
    ...opts.argv.slice(1),
  ];
}

/**
 * If enabled and not already under Xvfb, re-exec the same Node/tsx command via xvfb-run.
 * Does not return when re-exec starts (process.exit with child status).
 */
export function maybeReexecUnderXvfb(enabled: boolean): void {
  if (!enabled) return;
  if (isUnderVirtualDisplay()) {
    console.log(`[cli] virtual-display active DISPLAY=${process.env.DISPLAY ?? '(unset)'}`);
    return;
  }

  const xvfb = xvfbRunPath();
  if (!xvfb) {
    console.error(
      '[cli] --virtual-display requires xvfb-run (package xvfb). Install: sudo apt install xvfb',
    );
    process.exit(2);
  }

  const childArgs = buildXvfbChildArgs({
    execPath: process.execPath,
    execArgv: process.execArgv,
    argv: process.argv,
  });
  console.log(`[cli] re-exec under xvfb-run (headed Chrome off primary display)`);
  const result = spawnSync(xvfb, childArgs, {
    env: { ...process.env, [XVFB_MARKER]: '1' },
    stdio: 'inherit',
  });
  if (result.error) {
    console.error(`[cli] xvfb-run failed: ${result.error.message}`);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}
