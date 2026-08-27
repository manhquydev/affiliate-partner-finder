import { describe, expect, it } from 'vitest';
import { assertSafeProfilePath } from '../lib/safe-paths';
import { execCli } from './helpers/cli-exec';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

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
  it('exits non-zero when profile points at User Data', () => {
    expect(() =>
      execCli(root, [
        '--query',
        'test',
        '--out',
        process.platform === 'win32' ? 'C:\\Temp\\apf-cli-guard-out' : '/tmp/apf-cli-guard-out',
        '--profile',
        process.platform === 'win32'
          ? 'C:\\Users\\u\\AppData\\Local\\Google\\Chrome\\User Data'
          : '/home/u/.config/google-chrome/User Data',
      ]),
    ).toThrow();
  });
});
