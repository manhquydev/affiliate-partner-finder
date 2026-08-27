#!/usr/bin/env node
/** P50/P95 phase timings from JSONL with timingsMs. */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const PHASES = ['goto', 'settle', 'detector', 'probe', 'total'];

/** Nearest-rank percentile on a pre-sorted ascending array. */
export function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[i];
}

export function collectTimings(jsonlText) {
  const phases = Object.fromEntries(PHASES.map((k) => [k, []]));
  for (const line of jsonlText.split('\n')) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line);
      const t = row.timingsMs;
      if (!t) continue;
      for (const k of PHASES) {
        if (typeof t[k] === 'number') phases[k].push(t[k]);
      }
    } catch {
      /* skip */
    }
  }
  return phases;
}

export function formatTimingReport(phases) {
  return PHASES.map((k) => {
    const sorted = [...phases[k]].sort((a, b) => a - b);
    return `${k}: n=${sorted.length} p50=${percentile(sorted, 50)} p95=${percentile(sorted, 95)}`;
  }).join('\n');
}

export function analyzeTimingsFile(jsonlPath) {
  return formatTimingReport(collectTimings(readFileSync(jsonlPath, 'utf8')));
}

function main(argv = process.argv.slice(2)) {
  const jsonl = argv[0];
  if (!jsonl || !existsSync(jsonl)) {
    console.error('Usage: node scripts/analyze-track-s-timings.mjs <results.jsonl>');
    process.exit(1);
  }
  console.log(analyzeTimingsFile(jsonl));
}

const entry = process.argv[1] && resolve(process.argv[1]);
if (entry && import.meta.url === pathToFileURL(entry).href) {
  main();
}
