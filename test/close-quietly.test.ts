import { describe, it, expect } from 'vitest';
import { closeQuietly } from '../cli/browser';

describe('closeQuietly', () => {
  it('resolves quickly when close succeeds', async () => {
    let closed = false;
    const t0 = Date.now();
    await closeQuietly(
      {
        close: async () => {
          closed = true;
        },
      },
      2000,
    );
    expect(closed).toBe(true);
    expect(Date.now() - t0).toBeLessThan(500);
  });

  it('does not hang when close never resolves', async () => {
    const t0 = Date.now();
    await closeQuietly(
      {
        close: () => new Promise(() => undefined), // intentionally never resolves
      },
      80,
    );
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeGreaterThanOrEqual(70);
    expect(elapsed).toBeLessThan(500);
  });

  it('ignores null/undefined targets', async () => {
    await expect(closeQuietly(null, 50)).resolves.toBeUndefined();
    await expect(closeQuietly(undefined, 50)).resolves.toBeUndefined();
  });

  it('swallows close() rejections', async () => {
    await expect(
      closeQuietly(
        {
          close: async () => {
            throw new Error('close failed');
          },
        },
        200,
      ),
    ).resolves.toBeUndefined();
  });
});
