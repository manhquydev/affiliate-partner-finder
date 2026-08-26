#!/usr/bin/env node
/** Seed companies.json from track-a sample list for A/B out dirs. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const samplePath = process.argv[2] || './plans/reports/track-a-none-ok-sample-domains.txt';
const outDir = process.argv[3];
if (!outDir) {
  console.error('Usage: node scripts/seed-track-a-companies.mjs [sample.txt] <out-dir>');
  process.exit(1);
}

const domains = readFileSync(samplePath, 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean);

mkdirSync(outDir, { recursive: true });
const companies = domains.map((domain, i) => ({
  name: `Sample ${i + 1}`,
  domain,
  website: `https://${domain.replace(/^www\./, '')}`,
}));

writeFileSync(join(outDir, 'companies.json'), JSON.stringify(companies, null, 2));
writeFileSync(
  join(outDir, 'progress.json'),
  JSON.stringify(
    {
      query: 'track-a-sample',
      total: companies.length,
      completed: 0,
      updatedAt: new Date().toISOString(),
      earlyExit: false,
    },
    null,
    2,
  ),
);
console.log(`Seeded ${companies.length} companies → ${outDir}`);
