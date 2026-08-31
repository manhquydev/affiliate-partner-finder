import { describe, it, expect } from 'vitest';
import { firstWaveStaggerMs } from '../cli/scan-stagger';

describe('firstWaveStaggerMs', () => {
  it('staggers only the first concurrency slots', () => {
    expect(firstWaveStaggerMs(0, 2, 1500)).toBe(0);
    expect(firstWaveStaggerMs(1, 2, 1500)).toBe(500);
    expect(firstWaveStaggerMs(2, 2, 1500)).toBe(0);
    expect(firstWaveStaggerMs(199, 2, 1500)).toBe(0);
  });

  it('never grows with pending index (STAGGER_WALL lock)', () => {
    const n200 = Array.from({ length: 200 }, (_, i) => firstWaveStaggerMs(i, 2, 1500));
    expect(n200.reduce((a, b) => a + b, 0)).toBe(500);
    expect(Math.max(...n200)).toBe(500);
  });
});
