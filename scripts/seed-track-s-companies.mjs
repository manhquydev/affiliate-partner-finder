#!/usr/bin/env node
/** Seed companies.json + progress.json for Track S --resume scans. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const cohortPath = process.argv[2] || './plans/reports/track-s-benchmark-cohort-200.json';
const outDir = process.argv[3];
if (!outDir) {
  console.error('Usage: node scripts/seed-track-s-companies.mjs [cohort.json] <out-dir>');
  process.exit(1);
}

if (!existsSync(cohortPath)) {
  console.error(`Missing cohort: ${cohortPath}. Run: node scripts/build-track-s-cohort.mjs`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(cohortPath, 'utf8'));
const companies = manifest.companies ?? manifest;
if (!Array.isArray(companies) || companies.length === 0) {
  console.error('Cohort empty');
  process.exit(1);
}

for (const c of companies) {
  if (!c.domain || !c.name || !c.trustpilotUrl) {
    console.error('Invalid Company row:', c);
    process.exit(1);
  }
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'companies.json'), JSON.stringify(companies, null, 2));
writeFileSync(
  join(outDir, 'progress.json'),
  JSON.stringify(
    {
      query: 'track-s-benchmark',
      total: companies.length,
      completed: 0,
      updatedAt: new Date().toISOString(),
      earlyExit: false,
      phase: 'scan',
    },
    null,
    2,
  ),
);
console.log(`Seeded ${companies.length} companies → ${outDir}`);
