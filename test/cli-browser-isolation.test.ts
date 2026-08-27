import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('profile scan isolation (regression locks)', () => {
  it('scanOneCli always closeQuietly(page) — no profile skip-close', () => {
    const src = readFileSync(join(root, 'cli/scan.ts'), 'utf8');
    expect(src).toMatch(/closeQuietly\(page/);
    expect(src).not.toMatch(/mode\s*===\s*['"]profile['"][\s\S]{0,120}skip/i);
    expect(src).not.toMatch(/keepAlive/);
  });

  it('openPage uses context.newPage(), not keepAlive reuse', () => {
    const src = readFileSync(join(root, 'cli/browser.ts'), 'utf8');
    expect(src).toMatch(/openPage:\s*async\s*\(\)\s*=>\s*\(\{\s*page:\s*await\s*context\.newPage\(\)/);
    expect(src).not.toMatch(/page:\s*keepAlive/);
  });
});
