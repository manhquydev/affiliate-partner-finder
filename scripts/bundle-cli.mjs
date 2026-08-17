#!/usr/bin/env node
/**
 * Bundle CLI entry for Electron extraResources (no tsx at runtime).
 * Playwright stays external (native browsers/drivers); everything else
 * (p-limit, idb, …) must be bundled so the packaged CLI runs standalone.
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
  external: ['playwright'],
  sourcemap: true,
  logLevel: 'info',
});

console.log('[bundle-cli] wrote dist-cli/index.js (playwright external)');
