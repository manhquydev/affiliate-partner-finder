#!/usr/bin/env node
/**
 * Bundle Electron main process (TS) for production — no tsx at runtime.
 */
import { build } from 'esbuild';

await build({
  entryPoints: ['desktop/main.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: 'desktop/main.bundle.cjs',
  external: ['electron'],
  sourcemap: true,
  logLevel: 'info',
});

console.log('[bundle-desktop-main] wrote desktop/main.bundle.cjs');
