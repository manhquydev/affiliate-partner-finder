#!/usr/bin/env node
/**
 * Prepare dist-cli + bundled main for electron-builder (Windows NSIS).
 * Playwright stays external under resources/cli/node_modules (system Chrome at runtime).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: opts.cwd ?? root,
    stdio: 'inherit',
    env: { ...process.env, ...opts.env },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log('[prepare-desktop-pack] bundle CLI…');
run(process.execPath, ['scripts/bundle-cli.mjs']);

console.log('[prepare-desktop-pack] bundle Electron main…');
run(process.execPath, ['scripts/bundle-desktop-main.mjs']);

const cliDir = join(root, 'dist-cli');
mkdirSync(cliDir, { recursive: true });

writeFileSync(
  join(cliDir, 'package.json'),
  JSON.stringify(
    {
      name: 'affiliate-partner-finder-cli',
      private: true,
      type: 'module',
      dependencies: {
        playwright: '^1.62.1',
        'p-limit': '^7.3.1',
      },
    },
    null,
    2,
  ),
);

console.log('[prepare-desktop-pack] install CLI runtime deps (skip browser download)…');
run('npm', ['install', '--omit=dev', '--no-package-lock'], {
  cwd: cliDir,
  env: { PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1' },
});

console.log('[prepare-desktop-pack] ready — run electron-builder --win');
