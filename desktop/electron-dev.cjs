/** Electron bootstraps then loads ESM TS main via tsx. */
const { register } = require('tsx/cjs/api');
register();
import('./main.ts').catch((err) => {
  console.error('[desktop] failed to load main:', err);
  process.exit(1);
});
