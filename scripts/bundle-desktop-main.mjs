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
  banner: {
    js: "var __import_meta_url = require('url').pathToFileURL(__filename).href;",
  },
  define: {
    'import.meta.url': '__import_meta_url',
  },
});

console.log('[bundle-desktop-main] wrote desktop/main.bundle.cjs');
