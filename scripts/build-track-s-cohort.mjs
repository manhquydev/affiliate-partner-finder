#!/usr/bin/env node
/**
 * Build fixed Track S benchmark cohort (target 200 Company rows).
 * Sources (priority): pilot-200 companies.json → merge track-a + golden + none-ok list.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'plans/reports/track-s-benchmark-cohort-200.json');
const TARGET = 200;

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

function tpUrl(domain) {
  const d = domain.replace(/^www\./, '');
  return `https://www.trustpilot.com/review/${domain.includes('www.') ? domain : d}`;
}

function companyFromPartial(row, i) {
  const domain = row.domain?.replace(/^https?:\/\//, '').split('/')[0] ?? row;
  return {
    name: row.name ?? `Benchmark ${i + 1}`,
    domain,
    trustScore: row.trustScore ?? null,
    reviews: row.reviews ?? null,
    trustpilotUrl: row.trustpilotUrl ?? tpUrl(domain),
  };
}

function dedupeCompanies(list) {
  const seen = new Set();
  const out = [];
  for (const c of list) {
    const key = c.domain.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

function loadSources() {
  const pilot = readJson(join(ROOT, 'out/design-pilot-200/companies.json'));
  if (Array.isArray(pilot) && pilot.length >= TARGET) {
    return { companies: pilot.slice(0, TARGET), source: 'out/design-pilot-200/companies.json' };
  }

  const merged = [];
  const trackA = readJson(join(ROOT, 'plans/reports/track-a-ab-sample-companies.json'));
  if (Array.isArray(trackA)) merged.push(...trackA.map(companyFromPartial));

  const noneOkTxt = join(ROOT, 'plans/reports/track-a-none-ok-sample-domains.txt');
  if (existsSync(noneOkTxt)) {
    for (const line of readFileSync(noneOkTxt, 'utf8').split('\n')) {
      const d = line.trim();
      if (d) merged.push(companyFromPartial({ domain: d }, merged.length));
    }
  }

  const GOLDEN_DOMAINS = [
    'vecteezy.com',
    'nordicnest.se',
    'designbyamor.com',
    'design-bestseller.de',
    'madeindesign.com',
    'williamwoodmirrors.co.uk',
    'ozdesignfurniture.com.au',
    'flinders.nl',
    'mohd.it',
    'finnishdesignshop.com',
    'namly.dk',
    'thorvalddesign.com',
    'pazzodesign.it',
  ];
  for (const domain of GOLDEN_DOMAINS) {
    merged.push(companyFromPartial({ domain, name: domain }, merged.length));
  }

  let companies = dedupeCompanies(merged);
  const source = 'track-a-ab + track-a-none-ok + golden domains';
  return { companies, source };
}

function isPadDomain(domain) {
  return /\.invalid$/i.test(domain) || /track-s-pad-/i.test(domain);
}

const { companies: raw, source } = loadSources();
let companies = dedupeCompanies(raw).filter((c) => !isPadDomain(c.domain));

const goldenDomains = new Set([
  'vecteezy.com',
  'nordicnest.se',
  'designbyamor.com',
  'design-bestseller.de',
  'madeindesign.com',
  'williamwoodmirrors.co.uk',
  'ozdesignfurniture.com.au',
  'flinders.nl',
  'mohd.it',
  'finnishdesignshop.com',
  'namly.dk',
  'thorvalddesign.com',
  'pazzodesign.it',
]);
for (const domain of goldenDomains) {
  if (!companies.some((c) => c.domain.toLowerCase() === domain)) {
    companies.unshift(companyFromPartial({ domain, name: domain }, companies.length));
  }
}
companies = dedupeCompanies(companies);
while (companies.length > TARGET) {
  const idx = companies.findLastIndex((c) => !goldenDomains.has(c.domain.toLowerCase()));
  if (idx < 0) break;
  companies.splice(idx, 1);
}
companies = companies.slice(0, TARGET);
const directional = companies.length < TARGET;

const manifest = {
  created: new Date().toISOString(),
  source,
  n: companies.length,
  target: TARGET,
  directional,
  companies,
};

writeFileSync(OUT, JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ out: OUT, n: companies.length, directional, source }, null, 2));
if (companies.some((c) => isPadDomain(c.domain))) {
  console.error(`ERROR: cohort contains padded domains — reject`);
  process.exit(1);
}
if (directional) {
  console.warn(`WARN: cohort has ${companies.length}<${TARGET} — metrics must banner DIRECTIONAL`);
  process.exit(1);
}
