import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveJobCsv } from '../desktop/job-csv';

describe('resolveJobCsv', () => {
  it('returns undefined when neither csv exists', () => {
    const dir = mkdtempSync(join(tmpdir(), 'apf-job-csv-'));
    expect(resolveJobCsv(dir)).toBeUndefined();
  });

  it('returns companies.csv when only that file exists', () => {
    const dir = mkdtempSync(join(tmpdir(), 'apf-job-csv-'));
    const companies = join(dir, 'companies.csv');
    writeFileSync(companies, '');
    expect(resolveJobCsv(dir)).toBe(companies);
  });

  it('returns results.csv when only that file exists', () => {
    const dir = mkdtempSync(join(tmpdir(), 'apf-job-csv-'));
    const results = join(dir, 'results.csv');
    writeFileSync(results, '');
    expect(resolveJobCsv(dir)).toBe(results);
  });

  it('prefers results.csv when both files exist', () => {
    const dir = mkdtempSync(join(tmpdir(), 'apf-job-csv-'));
    const results = join(dir, 'results.csv');
    const companies = join(dir, 'companies.csv');
    writeFileSync(results, '');
    writeFileSync(companies, '');
    expect(resolveJobCsv(dir)).toBe(results);
  });
});
