#!/usr/bin/env node
/**
 * Write plans/reports/metrics-track-s-ab.md with GATE: PASS|FAIL.
 * Usage: node scripts/finalize-track-s-ab.mjs <controlOut> <treatmentOut> <controlSec> <treatmentSec> [cohort.json]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_REPORT = join(ROOT, 'plans/reports/metrics-track-s-ab.md');

function loadMap(jsonlPath) {
  const map = new Map();
  if (!existsSync(jsonlPath)) return map;
  for (const line of readFileSync(jsonlPath, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line);
      if (row?.domain) map.set(row.domain, row);
    } catch {
      /* skip */
    }
  }
  return map;
}

function simpleHit(r) {
  if (r.loadStatus !== 'ok') return 'unknown';
  if (r.verdict === 'affiliate' || r.verdict === 'partner_trade') return 'true';
  if (r.verdict === 'none') return 'false';
  return 'unknown';
}

function normHost(value) {
  return String(value || '')
    .replace(/^www\./, '')
    .toLowerCase();
}

function rowHost(row) {
  try {
    return normHost(new URL(row.finalUrl || row.websiteUrl || '').hostname);
  } catch {
    return normHost(row.domain);
  }
}

function hasNewPathEvidence(c, t) {
  const cPaths = c.evidence?.pathHits?.length ?? 0;
  const tPaths = t.evidence?.pathHits?.length ?? 0;
  return tPaths > cPaths;
}

function main() {
  const [controlOut, treatmentOut, controlSecRaw, treatmentSecRaw, cohortPath] = process.argv.slice(2);
  if (!controlOut || !treatmentOut) {
    console.error(
      'Usage: node scripts/finalize-track-s-ab.mjs <controlOut> <treatmentOut> <controlSec> <treatmentSec> [cohort.json]',
    );
    process.exit(1);
  }

  const controlSec = Number(controlSecRaw) || 0;
  const treatmentSec = Number(treatmentSecRaw) || 0;
  const control = loadMap(join(controlOut, 'results.jsonl'));
  const treatment = loadMap(join(treatmentOut, 'results.jsonl'));
  const domains = [...control.keys()].filter((d) => treatment.has(d)).sort();

  let falseFlips = 0;
  let noneOkFn = 0;
  let blockedToNone = 0;
  let crossDomain = 0;
  const diffs = [];
  const ethicsRows = [];
  const crossRows = [];

  for (const domain of domains) {
    const c = control.get(domain);
    const t = treatment.get(domain);
    const cs = simpleHit(c);
    const ts = simpleHit(t);
    if (cs !== ts) diffs.push({ domain, control: cs, treatment: ts, cVerdict: c.verdict, tVerdict: t.verdict });

    if (cs === 'true' && ts === 'false') falseFlips++;

    if (c.loadStatus === 'ok' && c.verdict === 'none' && t.loadStatus === 'ok') {
      if (t.verdict === 'affiliate' || t.verdict === 'partner_trade') {
        if (!hasNewPathEvidence(c, t)) noneOkFn++;
      }
    }

    if (t.loadStatus !== 'ok' && t.verdict === 'none') {
      blockedToNone++;
      ethicsRows.push(domain);
    }

    const expected = normHost(domain);
    const got = rowHost(t);
    if (t.loadStatus === 'ok' && got && expected && got !== expected && !got.endsWith(`.${expected}`)) {
      crossDomain++;
      crossRows.push(`${domain} → ${t.finalUrl}`);
    }
  }

  const speedupPct =
    controlSec > 0 && treatmentSec > 0 ? ((controlSec - treatmentSec) / controlSec) * 100 : null;
  const throughputPass = speedupPct != null && speedupPct >= 25;

  let goldenPass = false;
  let goldenNote = 'skipped (no results.json)';
  const treatmentJson = join(treatmentOut, 'results.json');
  if (existsSync(treatmentJson)) {
    try {
      execFileSync(process.execPath, [join(ROOT, 'test/verify-golden.mjs'), treatmentJson], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      goldenPass = true;
      goldenNote = 'verify-golden PASS on treatment';
    } catch (e) {
      goldenNote = String(e.stderr || e.stdout || e.message || 'verify-golden FAIL').trim();
    }
  }

  let cohortN = domains.length;
  let directional = true;
  if (cohortPath && existsSync(cohortPath)) {
    try {
      const manifest = JSON.parse(readFileSync(cohortPath, 'utf8'));
      cohortN = manifest.n ?? manifest.companies?.length ?? cohortN;
      directional = manifest.directional === true || cohortN < 200;
    } catch {
      /* keep defaults */
    }
  }

  const throughputChecks = {
    throughput: throughputPass,
    noneOkFn: noneOkFn === 0,
    ethics: blockedToNone === 0,
    falseFlips: falseFlips === 0,
    crossDomain: crossDomain === 0,
    complete: control.size === treatment.size && control.size > 0,
  };
  const goldenCheck = goldenPass;
  const gatePass = directional
    ? Object.values(throughputChecks).every(Boolean)
    : Object.values({ ...throughputChecks, golden: goldenCheck }).every(Boolean);
  const gateLabel = directional
    ? gatePass
      ? 'GATE: PASS (directional-throughput)'
      : 'GATE: FAIL'
    : gatePass
      ? 'GATE: PASS'
      : 'GATE: FAIL';

  const lines = [
    directional ? '# DIRECTIONAL — cohort n<200; gate runs but not a production throughput claim.' : '# Track S A/B gate',
    '',
    `**Date:** ${new Date().toISOString()}`,
    `**Cohort n:** ${cohortN} (paired ${domains.length})`,
    '',
    '## Wall-clock',
    '',
    `- Control: ${controlSec}s`,
    `- Treatment (--probe-parallel): ${treatmentSec}s`,
    speedupPct != null ? `- Speedup: ${speedupPct.toFixed(1)}% (need ≥25%)` : '- Speedup: n/a',
    '',
    '## Quality checks',
    '',
    `| Check | Result |`,
    `|-------|--------|`,
    `| Throughput ≥25% | ${throughputChecks.throughput ? 'PASS' : 'FAIL'} |`,
    directional
      ? `| Golden FP=0 (treatment) | ${goldenCheck ? 'PASS' : 'FAIL'} (non-blocking directional) |`
      : `| Golden FP=0 (treatment) | ${goldenCheck ? 'PASS' : 'FAIL'} |`,
    `| none@ok FN (no new path evidence) | ${throughputChecks.noneOkFn ? 'PASS' : `FAIL (${noneOkFn})`} |`,
    `| same-row blocked→none ethics | ${throughputChecks.ethics ? 'PASS' : `FAIL (${blockedToNone})`} |`,
    `| true→false regression | ${throughputChecks.falseFlips ? 'PASS' : `FAIL (${falseFlips})`} |`,
    `| cross-domain finalUrl | ${throughputChecks.crossDomain ? 'PASS' : `FAIL (${crossDomain})`} |`,
    `| Both arms complete | ${throughputChecks.complete ? 'PASS' : 'FAIL'} |`,
    '',
    `**Golden note:** ${goldenNote}`,
    '',
    '## Paired verdict diffs',
    '',
    `**Count:** ${diffs.length}`,
    `**true→false (regression):** ${falseFlips}`,
    '',
  ];

  if (ethicsRows.length) {
    lines.push('## Same-row ethics violations', '', ethicsRows.slice(0, 20).join(', '), '');
  }
  if (crossRows.length) {
    lines.push('## Cross-domain rows (treatment)', '', ...crossRows.slice(0, 20).map((r) => `- ${r}`), '');
  }

  if (diffs.length) {
    lines.push('| domain | control | treatment |', '|--------|---------|-----------|');
    for (const d of diffs.slice(0, 30)) {
      lines.push(`| ${d.domain} | ${d.control} (${d.cVerdict}) | ${d.treatment} (${d.tVerdict}) |`);
    }
    if (diffs.length > 30) lines.push('', `_…${diffs.length - 30} more_`);
  }

  lines.push('', `**${gateLabel}**`);
  const body = lines.join('\n');
  const reportPath = process.env.TRACK_S_AB_REPORT || DEFAULT_REPORT;
  writeFileSync(reportPath, `${body}\n`);
  console.log(body);
  process.exit(gatePass ? 0 : 1);
}

main();
