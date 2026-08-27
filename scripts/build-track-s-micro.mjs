#!/usr/bin/env node
/** Slice first N companies from benchmark cohort for quick trial. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'plans/reports/track-s-benchmark-cohort-200.json');
const OUT = join(ROOT, 'plans/reports/track-s-micro-cohort.json');
const n = Math.max(1, Math.min(10, Number(process.argv[2]) || 3));

if (!existsSync(SRC)) {
  console.error('Run: node scripts/build-track-s-cohort.mjs');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(SRC, 'utf8'));
const companies = (manifest.companies ?? manifest).slice(0, n);
writeFileSync(
  OUT,
  JSON.stringify(
    {
      created: new Date().toISOString(),
      source: `slice:${SRC}:0..${n}`,
      n: companies.length,
      target: n,
      directional: true,
      micro: true,
      companies,
    },
    null,
    2,
  ),
);
console.log(`Wrote ${OUT} n=${companies.length}`);
