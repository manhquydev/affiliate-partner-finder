import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cohortPath = join(root, 'plans/reports/track-s-benchmark-cohort-200.json');

describe('track-s cohort + seed', () => {
  it('cohort manifest has valid Company rows', () => {
    expect(existsSync(cohortPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(cohortPath, 'utf8'));
    const companies = manifest.companies ?? manifest;
    expect(Array.isArray(companies)).toBe(true);
    expect(companies.length).toBeGreaterThan(0);
    for (const c of companies) {
      expect(typeof c.domain).toBe('string');
      expect(typeof c.name).toBe('string');
      expect(typeof c.trustpilotUrl).toBe('string');
    }
  });

  it('seed writes companies.json + progress.json for resume', () => {
    const out = mkdtempSync(join(tmpdir(), 'track-s-seed-'));
    try {
      execFileSync(process.execPath, [
        join(root, 'scripts/seed-track-s-companies.mjs'),
        cohortPath,
        out,
      ]);
      const companies = JSON.parse(readFileSync(join(out, 'companies.json'), 'utf8'));
      const progress = JSON.parse(readFileSync(join(out, 'progress.json'), 'utf8'));
      expect(companies.length).toBeGreaterThan(0);
      expect(progress.phase).toBe('scan');
      expect(progress.completed).toBe(0);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
