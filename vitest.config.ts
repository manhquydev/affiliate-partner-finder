import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // Default node env; detector.test.ts opts into jsdom via a file docblock.
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
