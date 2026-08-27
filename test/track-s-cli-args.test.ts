import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { clampProbeBatchSize } from '../lib/probe-batch';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tsx = join(root, 'node_modules', '.bin', 'tsx');

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
    const out = execFileSync(tsx, ['cli/index.ts', '--help'], { encoding: 'utf8', cwd: root });
    expect(out).toMatch(/--probe-parallel\s+Path-probe fetches in parallel batches \(default OFF/);
    expect(out).toMatch(/--probe-batch-size\s+Parallel batch size 1\.\.3/);
  });
});
