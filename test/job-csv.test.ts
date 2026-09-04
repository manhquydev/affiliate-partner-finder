import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ensureCompaniesCsv, listJobArtefacts, resolveJobCsv } from '../desktop/job-csv';
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

  it('lists companies.csv, results.csv, then results.full.csv', () => {
    const dir = mkdtempSync(join(tmpdir(), 'apf-job-csv-'));
    writeFileSync(join(dir, 'results.full.csv'), '');
    writeFileSync(join(dir, 'companies.csv'), '');
    writeFileSync(join(dir, 'results.csv'), '');
    expect(listJobArtefacts(dir)).toEqual(['companies.csv', 'results.csv', 'results.full.csv']);
  });

  it('ensureCompaniesCsv writes from companies.json when csv is missing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'apf-job-csv-'));
    writeFileSync(
      join(dir, 'companies.json'),
      JSON.stringify([{ name: 'Acme', domain: 'acme.com' }]),
    );
    const csv = ensureCompaniesCsv(dir);
    expect(csv).toBe(join(dir, 'companies.csv'));
    expect(readFileSync(csv!, 'utf8')).toMatch(/^stt,ten_website,link\n1,Acme,https:\/\/acme\.com/);
  });

  it('ensureCompaniesCsv does not write from empty snapshot', () => {
    const dir = mkdtempSync(join(tmpdir(), 'apf-job-csv-'));
    writeFileSync(join(dir, 'companies.json'), '[]');
    expect(ensureCompaniesCsv(dir)).toBeUndefined();
    expect(listJobArtefacts(dir)).toEqual([]);
  });
});
