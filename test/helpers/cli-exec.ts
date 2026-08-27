import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

function tsxCli(root: string): string {
  return join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs');
}

function runTsx(root: string, args: string[], stdio: 'pipe' | 'inherit' = 'pipe'): string {
  const cli = tsxCli(root);
  if (!existsSync(cli)) {
    throw new Error(`tsx CLI not found at ${cli}`);
  }
  return execFileSync(process.execPath, [cli, ...args], {
    encoding: 'utf8',
    cwd: root,
    stdio,
  }) as string;
}

export function execCliHelp(root: string): string {
  return runTsx(root, ['cli/index.ts', '--help']);
}

export function execCli(
  root: string,
  args: string[],
  opts?: { stdio?: 'pipe' | 'inherit' },
): string {
  return runTsx(root, ['cli/index.ts', ...args], opts?.stdio ?? 'pipe');
}
