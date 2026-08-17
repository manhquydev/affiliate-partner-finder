/**
 * electron-builder afterPack hook — copy CLI runtime deps (playwright, p-limit)
 * into resources/cli/node_modules. electron-builder's extraResources filter
 * drops node_modules directories, so the copy must happen here.
 */
const { cpSync, existsSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const src = join(root, 'dist-cli', 'node_modules');

module.exports = async function afterPack(context) {
  if (!existsSync(src)) {
    throw new Error(`afterPack: ${src} missing — run scripts/prepare-desktop-pack.mjs first`);
  }
  const dest = join(context.appOutDir, 'resources', 'cli', 'node_modules');
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true, verbatimSymlinks: true });
  console.log(`[afterPack] copied CLI node_modules → ${dest}`);
};
