#!/usr/bin/env node
/**
 * Bundle CLI entry for Electron extraResources (no tsx at runtime).
 * YAGNI: marks playwright external — pack machine must have node_modules/playwright.
 */
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';

mkdirSync('dist-cli', { recursive: true });

await build({
  entryPoints: ['cli/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist-cli/index.js',
  packages: 'external',
  sourcemap: true,
  logLevel: 'info',
});

console.log('[bundle-cli] wrote dist-cli/index.js (playwright external)');
