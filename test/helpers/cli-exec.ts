import { execFileSync, spawnSync } from 'node:child_process';
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

function runTsx(root: string, args: string[], stdio: 'pipe' | 'inherit' = 'pipe'): string {
  if (process.platform === 'win32') {
    const r = spawnSync('npx', ['tsx', ...args], {
      cwd: root,
      encoding: 'utf8',
      shell: true,
      stdio,
    });
    if (r.error) throw r.error;
    if (r.status !== 0) {
      throw new Error((r.stderr || r.stdout || `tsx exit ${r.status}`).trim());
    }
    return r.stdout ?? '';
  }
  return execFileSync(localTsxBin(root), args, {
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
