import { describe, it, expect } from 'vitest';
import { toInjectableSource } from '../cli/injectable';
import { runDetector } from '../lib/detector';

describe('toInjectableSource', () => {
  it('strips esbuild __name helpers from runDetector', () => {
    const src = toInjectableSource(runDetector as (...args: never[]) => unknown);
    expect(src.includes('__name')).toBe(false);
    expect(src.includes('function runDetector') || src.startsWith('function')).toBe(true);
  });
});
