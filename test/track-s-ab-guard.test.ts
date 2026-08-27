import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ab = join(root, 'scripts', 'track-s-ab.sh');

function runAb(env: Record<string, string>): { status: number; stderr: string } {
  try {
    execFileSync('bash', [ab], {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { status: 0, stderr: '' };
  } catch (err) {
    const e = err as { status?: number; stderr?: Buffer };
    return { status: e.status ?? 1, stderr: e.stderr?.toString() ?? '' };
  }
}

describe('track-s-ab.sh guards', () => {
  it('refuses design-full-10k out path', () => {
    const r = runAb({ TRACK_S_CONTROL_OUT: './out/design-full-10k-shards/shard-0' });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/REFUSE.*design-full-10k/);
  });

  it('refuses out path outside track-s-*', () => {
    const r = runAb({ TRACK_S_CONTROL_OUT: './out/random-run' });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/REFUSE.*track-s-/);
  });
});
