import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { assertSafeProfilePath } from '../lib/safe-paths';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tsx = join(root, 'node_modules', '.bin', 'tsx');

describe('assertSafeProfilePath', () => {
  it('rejects Chrome User Data', () => {
    expect(() =>
      assertSafeProfilePath('/home/u/.config/google-chrome/User Data'),
    ).toThrow(/User Data/);
  });

  it('accepts app-owned cache profile', () => {
    const p = assertSafeProfilePath('/home/u/.cache/affiliate-partner-finder/chrome-profile');
    expect(p).toContain('chrome-profile');
  });
});

describe('CLI --profile guard', () => {
  it('exits 2 when profile points at User Data', () => {
    expect(() =>
      execFileSync(
        tsx,
        [
          'cli/index.ts',
          '--query',
          'test',
          '--out',
          '/tmp/apf-cli-guard-out',
          '--profile',
          '/home/u/.config/google-chrome/User Data',
        ],
        { encoding: 'utf8', cwd: root, stdio: 'pipe' },
      ),
    ).toThrow();
  });
});
