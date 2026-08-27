import { describe, expect, it } from 'vitest';
import { clampProbeBatchSize } from '../lib/probe-batch';
import { execCliHelp } from './helpers/cli-exec';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('clampProbeBatchSize', () => {
  it('clamps to 1..3', () => {
    expect(clampProbeBatchSize(0)).toBe(1);
    expect(clampProbeBatchSize(99)).toBe(3);
    expect(clampProbeBatchSize(NaN)).toBe(3);
    expect(clampProbeBatchSize(2)).toBe(2);
  });
});

describe('CLI probe flags (--help)', () => {
  it('documents probe-parallel default OFF', () => {
    const out = execCliHelp(root);
    expect(out).toMatch(/--probe-parallel\s+Path-probe fetches in parallel batches \(default OFF/);
    expect(out).toMatch(/--probe-batch-size\s+Parallel batch size 1\.\.3/);
  });
});

describe('desktop probe-parallel GUI default OFF', () => {
  it('#probeParallel exists and is not checked', () => {
    const html = readFileSync(join(root, 'desktop/renderer/index.html'), 'utf8');
    expect(html).toMatch(/id=["']probeParallel["']/);
    expect(html).not.toMatch(/id=["']probeParallel["'][^>]*\bchecked\b/);
    expect(html).not.toMatch(/<input[^>]*\bchecked\b[^>]*id=["']probeParallel["']/);
  });
});
