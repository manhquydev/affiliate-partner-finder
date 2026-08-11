#!/usr/bin/env node
// Verify an exported results.json from a real run against the golden set
// (docs/07 §2). Prints a pass/fail matrix + the acceptance summary (docs/07 §5).
//
// Usage:
//   node test/verify-golden.mjs path/to/results.json [--check-urls]
//
// --check-urls also fetches each affiliate row's evidenceUrl and asserts HTTP<400.

import { readFileSync } from 'node:fs';

/** Mirror of lib/export.simpleHit — keep in sync for live gates. */
function simpleHit(r) {
  if (r.loadStatus !== 'ok') return 'unknown';
  const e = r.evidence || {};
  if ((e.linkHits || []).length || (e.platformHits || []).length || (e.pathHits || []).length) return 'true';
  return 'false';
}

// Expected verdict per golden domain (confidence may drift ±1 level — docs/07 §3).
const GOLDEN = {
  'vecteezy.com': 'affiliate',
  'nordicnest.se': 'affiliate',
  'designbyamor.com': 'affiliate',
  'design-bestseller.de': 'affiliate',
  'madeindesign.com': 'partner_trade',
  'williamwoodmirrors.co.uk': 'partner_trade',
  'ozdesignfurniture.com.au': 'partner_trade',
  'namly.dk': 'none',
  'finnishdesignshop.com': 'none',
  'thorvalddesign.com': 'none',
  'mohd.it': 'none',
  'pazzodesign.it': 'none',
  'flinders.nl': 'unknown',
};
const AFFILIATE_HIGH = ['vecteezy.com', 'nordicnest.se', 'designbyamor.com', 'design-bestseller.de'];
const NONE_CASES = ['namly.dk', 'finnishdesignshop.com', 'thorvalddesign.com', 'mohd.it', 'pazzodesign.it'];

function domainKey(d) {
  return d.replace(/^www\./, '').toLowerCase();
}

async function main() {
  const file = process.argv[2];
  const checkUrls = process.argv.includes('--check-urls');
  if (!file) {
    console.error('Usage: node test/verify-golden.mjs <results.json> [--check-urls]');
    process.exit(2);
  }

  const results = JSON.parse(readFileSync(file, 'utf8'));
  const byDomain = new Map();
  for (const r of results) byDomain.set(domainKey(r.domain), r);

  console.log('\nDomain                          expected      got           conf     status  match');
  console.log('-'.repeat(88));
  let matched = 0;
  let present = 0;
  for (const [domain, expected] of Object.entries(GOLDEN)) {
    const r = byDomain.get(domainKey(domain));
    if (!r) {
      console.log(`${domain.padEnd(30)}  ${expected.padEnd(12)}  ${'(missing)'.padEnd(12)}`);
      continue;
    }
    present++;
    const ok = r.verdict === expected;
    if (ok) matched++;
    console.log(
      `${domain.padEnd(30)}  ${expected.padEnd(12)}  ${String(r.verdict).padEnd(12)}  ${String(r.confidence).padEnd(7)}  ${String(r.loadStatus).padEnd(6)}  ${ok ? 'OK' : 'XX'}`,
    );
  }

  // --- acceptance rules (docs/07 §5) ---
  const fails = [];

  const affHigh = AFFILIATE_HIGH.filter((d) => byDomain.get(domainKey(d))?.verdict === 'affiliate');
  if (affHigh.length !== 4) fails.push(`affiliate-high: ${affHigh.length}/4 correct`);

  const blockedAsNone = results.filter((r) => r.loadStatus !== 'ok' && r.verdict === 'none');
  if (blockedAsNone.length > 0) fails.push(`blocked→none: ${blockedAsNone.map((r) => r.domain).join(', ')}`);

  // End-user CSV contract: non-ok load must never become ket_qua=false.
  const nonOkAsFalse = results.filter((r) => r.loadStatus !== 'ok' && simpleHit(r) === 'false');
  if (nonOkAsFalse.length > 0) {
    fails.push(`non-ok→simple false: ${nonOkAsFalse.map((r) => r.domain).join(', ')}`);
  }

  const falseAff = NONE_CASES.filter((d) => byDomain.get(domainKey(d))?.verdict === 'affiliate');
  if (falseAff.length > 0) fails.push(`false-affiliate on none-cases: ${falseAff.join(', ')}`);

  // Every affiliate row must carry an evidenceUrl.
  const affNoEvidence = results.filter(
    (r) => r.verdict === 'affiliate' && !firstEvidenceUrl(r),
  );
  if (affNoEvidence.length > 0) fails.push(`affiliate without evidenceUrl: ${affNoEvidence.map((r) => r.domain).join(', ')}`);

  if (checkUrls) {
    const unreachable = [];
    for (const r of results.filter((x) => x.verdict === 'affiliate')) {
      const url = firstEvidenceUrl(r);
      if (!url) continue;
      try {
        const res = await fetch(url, { method: 'GET', redirect: 'follow' });
        if (res.status >= 400) unreachable.push(`${r.domain}(${res.status})`);
      } catch {
        unreachable.push(`${r.domain}(err)`);
      }
    }
    if (unreachable.length) fails.push(`unreachable evidenceUrl: ${unreachable.join(', ')}`);
  }

  console.log('\nAcceptance (docs/07 §5):');
  console.log(`  golden verdict match : ${matched}/${present} present (of ${Object.keys(GOLDEN).length} golden)`);
  if (fails.length === 0) {
    console.log('  ✅ PASS — all acceptance rules satisfied');
    process.exit(0);
  } else {
    console.log('  ❌ FAIL:');
    for (const f of fails) console.log(`     - ${f}`);
    process.exit(1);
  }
}

function firstEvidenceUrl(r) {
  const e = r.evidence || {};
  const strongLink = (e.linkHits || []).find((h) => h.isStrong);
  if (strongLink) return strongLink.href;
  const strongPath = (e.pathHits || []).find((h) => h.isStrong);
  if (strongPath) return strongPath.finalUrl || strongPath.path;
  return (e.linkHits || [])[0]?.href || (e.pathHits || [])[0]?.finalUrl || '';
}

main();
