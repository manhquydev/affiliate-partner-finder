#!/usr/bin/env node
/**
 * Realtime shard monitor — prints progress every N seconds.
 *   node scripts/shard-watch.mjs --manifest out/design-full-10k-shards/shard-manifest.json
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function parseArgs(argv) {
  let manifest = '';
  let intervalSec = 30;
  let sourceDone = 688;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i] ?? '';
    if (a === '--manifest') manifest = next();
    else if (a === '--interval') intervalSec = Math.max(5, Number(next()) || 30);
    else if (a === '--source-done') sourceDone = Number(next()) || 688;
  }
  if (!manifest) throw new Error('--manifest required');
  return { manifest: resolve(manifest), intervalSec, sourceDone };
}

function loadProgress(outDir) {
  const p = `${outDir}/progress.json`;
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function countJsonl(path) {
  if (!existsSync(path)) return 0;
  return readFileSync(path, 'utf8').split('\n').filter(Boolean).length;
}

function alivePid(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function tick(manifest, sourceDone) {
  const total = manifest.totalCompanies ?? 7465;
  let shardDone = 0;
  const lines = [];
  const now = new Date().toISOString().slice(11, 19);
  for (const w of manifest.workers) {
    const prog = loadProgress(w.out);
    const jl = countJsonl(`${w.out}/results.jsonl`);
    const done = prog?.completed ?? jl;
    const shardTotal = prog?.total ?? w.companies;
    const age = prog?.updatedAt ? '' : '';
    shardDone += done;
    const live = alivePid(w.pid) ? '●' : '○';
    lines.push(`  ${live} shard-${w.id}: ${done}/${shardTotal} (jsonl ${jl}) pid=${w.pid ?? '-'}`);
  }
  const merged = sourceDone + shardDone;
  const pct = ((merged / total) * 100).toFixed(1);
  console.log(`\n[watch ${now}] total≈${merged}/${total} (${pct}%) | conc=${manifest.concurrency ?? '?'} earlyExit=${manifest.earlyExit ?? false}`);
  console.log(lines.join('\n'));
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const manifest = JSON.parse(readFileSync(opts.manifest, 'utf8'));
  if (manifest.completedInSource != null) opts.sourceDone = manifest.completedInSource;

  console.log(`[watch] monitoring ${manifest.workers.length} shards every ${opts.intervalSec}s (Ctrl+C to stop)`);
  tick(manifest, opts.sourceDone);
  setInterval(() => {
    try {
      const m = JSON.parse(readFileSync(opts.manifest, 'utf8'));
      tick(m, m.completedInSource ?? opts.sourceDone);
    } catch (e) {
      console.error('[watch] error', e.message);
    }
  }, opts.intervalSec * 1000);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
