import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** Cross-platform path to the local tsx CLI (Windows uses .cmd shim). */
export function localTsxBin(root: string): string {
  const unix = join(root, 'node_modules', '.bin', 'tsx');
  if (process.platform === 'win32') {
    const cmd = `${unix}.cmd`;
    if (existsSync(cmd)) return cmd;
  }
  return unix;
}

export function execCliHelp(root: string): string {
  return execFileSync(localTsxBin(root), ['cli/index.ts', '--help'], {
    encoding: 'utf8',
    cwd: root,
  });
}

export function execCli(
  root: string,
  args: string[],
  opts?: { stdio?: 'pipe' | 'inherit' },
): string {
  return execFileSync(localTsxBin(root), ['cli/index.ts', ...args], {
    encoding: 'utf8',
    cwd: root,
    stdio: opts?.stdio ?? 'pipe',
  }) as string;
}
