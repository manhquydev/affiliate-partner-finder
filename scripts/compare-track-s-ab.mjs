#!/usr/bin/env node
/**
 * Compare control vs treatment JSONL for Track S trial/A/B.
 * Usage: node scripts/compare-track-s-ab.mjs <control.jsonl> <treatment.jsonl> [--out report.md]
 */
import { readFileSync, writeFileSync } from 'node:fs';

function loadMap(jsonlPath) {
  const map = new Map();
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

function avgProbeMs(rows) {
  const vals = rows.map((r) => r.timingsMs?.probe).filter((n) => typeof n === 'number');
  if (!vals.length) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function main() {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf('--out');
  const outPath = outIdx >= 0 ? args[outIdx + 1] : null;
  const paths = args.filter((a, i) => a !== '--out' && (outIdx < 0 || i !== outIdx + 1));
  const [controlPath, treatmentPath] = paths;
  if (!controlPath || !treatmentPath) {
    console.error('Usage: node scripts/compare-track-s-ab.mjs <control.jsonl> <treatment.jsonl> [--out report.md]');
    process.exit(1);
  }

  const control = loadMap(controlPath);
  const treatment = loadMap(treatmentPath);
  const domains = [...control.keys()].filter((d) => treatment.has(d)).sort();

  let noneToPositive = 0;
  let falseFlips = 0;
  let verdictDiff = 0;
  const diffs = [];

  for (const domain of domains) {
    const c = control.get(domain);
    const t = treatment.get(domain);
    const cs = simpleHit(c);
    const ts = simpleHit(t);
    if (cs !== ts) {
      verdictDiff++;
      diffs.push({ domain, control: cs, treatment: ts, cVerdict: c.verdict, tVerdict: t.verdict });
      if (cs === 'false' && ts === 'true') noneToPositive++;
      if (cs === 'true' && ts === 'false') falseFlips++;
    }
  }

  const cRows = domains.map((d) => control.get(d));
  const tRows = domains.map((d) => treatment.get(d));
  const cProbe = avgProbeMs(cRows);
  const tProbe = avgProbeMs(tRows);
  const probeSpeedup =
    cProbe != null && tProbe != null && tProbe > 0 ? ((cProbe - tProbe) / cProbe) * 100 : null;

  const lines = [
    '# Track S A/B comparison',
    '',
    `**Pairs:** ${domains.length}`,
    `**Verdict diffs:** ${verdictDiff}`,
    `**none→positive (ok):** ${noneToPositive}`,
    `**true→false (regression):** ${falseFlips}`,
    '',
    '## Probe timing (when --profile-timing on both arms)',
    '',
    cProbe != null ? `- Control avg probe ms: ${cProbe}` : '- Control: no timingsMs',
    tProbe != null ? `- Treatment avg probe ms: ${tProbe}` : '- Treatment: no timingsMs',
    probeSpeedup != null ? `- Probe delta: ${probeSpeedup.toFixed(1)}% (positive = treatment faster)` : '',
    '',
  ];

  if (diffs.length) {
    lines.push('## Paired diffs', '', '| domain | control | treatment |', '|--------|---------|-----------|');
    for (const d of diffs.slice(0, 20)) {
      lines.push(`| ${d.domain} | ${d.control} | ${d.treatment} |`);
    }
    if (diffs.length > 20) lines.push('', `_…${diffs.length - 20} more_`);
  }

  const trialPass = falseFlips === 0;
  lines.push('', `**TRIAL: ${trialPass ? 'PASS' : 'FAIL'}** (falseFlips must be 0)`);

  const body = lines.filter(Boolean).join('\n');
  console.log(body);
  if (outPath) writeFileSync(outPath, `${body}\n`);
}

main();
