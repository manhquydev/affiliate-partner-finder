import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { toCompaniesCSV } from '../lib/export.ts';
import type { Company } from '../lib/types.ts';

export const JOB_ARTEFACT_FILES = ['companies.csv', 'results.csv', 'results.full.csv'] as const;
export type JobArtefactFile = (typeof JOB_ARTEFACT_FILES)[number];

export function isJobArtefactFile(name: string): name is JobArtefactFile {
  return (JOB_ARTEFACT_FILES as readonly string[]).includes(name);
}

export function resolveJobCsv(outDir: string): string | undefined {
  const results = join(outDir, 'results.csv');
  if (existsSync(results)) return results;
  const companies = join(outDir, 'companies.csv');
  if (existsSync(companies)) return companies;
  return undefined;
}

export function listJobArtefacts(outDir: string): JobArtefactFile[] {
  return JOB_ARTEFACT_FILES.filter((file) => existsSync(join(outDir, file)));
}

export function resolveJobArtefact(outDir: string, name: string): string | undefined {
  if (!isJobArtefactFile(name)) return undefined;
  const path = join(outDir, name);
  return existsSync(path) ? path : undefined;
}

/** Derive companies.csv from companies.json so list jobs always have a spreadsheet. */
export function ensureCompaniesCsv(outDir: string): string | undefined {
  const csv = join(outDir, 'companies.csv');
  if (existsSync(csv)) return csv;
  const jsonPath = join(outDir, 'companies.json');
  if (!existsSync(jsonPath)) return undefined;
  try {
    const data = JSON.parse(readFileSync(jsonPath, 'utf8')) as unknown;
    if (!Array.isArray(data) || data.length === 0) return undefined;
    writeFileSync(csv, toCompaniesCSV(data as Company[]));
    return csv;
  } catch {
    return undefined;
  }
}
