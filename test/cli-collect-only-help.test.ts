import { describe, expect, it } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execCliHelp } from './helpers/cli-exec';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('CLI --collect-only (--help)', () => {
  it('documents stop after Trustpilot list and companies.csv', () => {
    const out = execCliHelp(root);
    expect(out).toMatch(
      /--collect-only\s+Stop after Trustpilot list; write companies.csv; no site scan/,
    );
  });
});
