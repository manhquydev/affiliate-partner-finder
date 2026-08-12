/** Electron bootstraps then loads ESM TS main via tsx. */
require('tsx/cjs/api').register();
import('./main.ts').catch((err) => {
  console.error(err);
  process.exit(1);
});
