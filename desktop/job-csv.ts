import { existsSync } from 'node:fs';
import { join } from 'node:path';

export function resolveJobCsv(outDir: string): string | undefined {
  const results = join(outDir, 'results.csv');
  if (existsSync(results)) return results;
  const companies = join(outDir, 'companies.csv');
  if (existsSync(companies)) return companies;
  return undefined;
}
