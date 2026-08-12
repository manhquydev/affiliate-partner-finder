/**
 * Merge source + shard results.jsonl into unified exports (CSV/JSON).
 *
 * Usage:
 *   npx tsx scripts/merge-shards.ts --manifest ./out/design-full-10k-shards/shard-manifest.json
 *   npx tsx scripts/merge-shards.ts --source ./out/design-full-10k --shard-base ./out/design-full-10k-shards
 */
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { toCSV, toJSON, toSimpleCSV, simpleHit } from '../lib/export.ts';
import type { Company, ScanResult } from '../lib/types.ts';

type Manifest = {
  source: string;
  outBase: string;
  workers: { id: number; out: string }[];
};

function parseArgs(argv: string[]) {
  let manifest = '';
  let source = '';
  let shardBase = '';
  let out = '';
  let help = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i] ?? '';
    if (a === '--help' || a === '-h') help = true;
    else if (a === '--manifest') manifest = next();
    else if (a === '--source') source = next();
    else if (a === '--shard-base') shardBase = next();
    else if (a === '--out') out = next();
    else throw new Error(`Unknown arg: ${a}`);
  }
  if (help) return { help: true as const };
  if (manifest) {
    const m = JSON.parse(readFileSync(resolve(manifest), 'utf8')) as Manifest;
    source = m.source;
    shardBase = m.outBase;
  }
  if (!source || !shardBase) {
    throw new Error('Need --manifest or both --source and --shard-base');
  }
  return {
    help: false as const,
    source: resolve(source),
    shardBase: resolve(shardBase),
    out: resolve(out || source),
  };
}

function loadJsonl(path: string): ScanResult[] {
  if (!existsSync(path)) return [];
  const rows: ScanResult[] = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line) as ScanResult;
      if (row?.domain && row?.evidence) rows.push(row);
    } catch {
      /* skip */
    }
  }
  return rows;
}

/** Later scannedAt wins; tie-break prefer ok > blocked > other. */
function pickBetter(a: ScanResult, b: ScanResult): ScanResult {
  const rank = (r: ScanResult) => {
    if (r.loadStatus === 'ok') return 3;
    if (r.loadStatus === 'blocked') return 2;
    return 1;
  };
  const ta = Date.parse(a.scannedAt);
  const tb = Date.parse(b.scannedAt);
  if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return ta > tb ? a : b;
  return rank(a) >= rank(b) ? a : b;
}

function discoverShardDirs(shardBase: string): string[] {
  if (!existsSync(shardBase)) return [];
  return readdirSync(shardBase, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^shard-\d+$/.test(d.name))
    .map((d) => join(shardBase, d.name))
    .sort();
}

function printHelp() {
  console.log(`merge-shards — combine source + shard JSONL into exports

  --manifest <path>   shard-manifest.json from shard-scan
  --source <dir>      Source job dir (with companies.json)
  --shard-base <dir>  Parent of shard-0..N
  --out <dir>         Write merged exports (default: source)
`);
}

function main(): number {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return 0;
  }

  const companiesPath = join(args.source, 'companies.json');
  if (!existsSync(companiesPath)) {
    console.error(`[merge] missing ${companiesPath}`);
    return 2;
  }
  const companies = JSON.parse(readFileSync(companiesPath, 'utf8')) as Company[];

  const map = new Map<string, ScanResult>();
  const sources: string[] = [join(args.source, 'results.jsonl')];
  for (const dir of discoverShardDirs(args.shardBase)) {
    sources.push(join(dir, 'results.jsonl'));
  }

  for (const path of sources) {
    for (const row of loadJsonl(path)) {
      const prev = map.get(row.domain);
      map.set(row.domain, prev ? pickBetter(prev, row) : row);
    }
  }

  const ordered = companies
    .map((c) => map.get(c.domain))
    .filter((r): r is ScanResult => Boolean(r));

  const csvPath = join(args.out, 'results.csv');
  const csvFullPath = join(args.out, 'results.full.csv');
  const jsonPath = join(args.out, 'results.json');
  const jsonlPath = join(args.out, 'results.merged.jsonl');

  writeFileSync(csvPath, toSimpleCSV(ordered));
  writeFileSync(csvFullPath, toCSV(ordered));
  writeFileSync(jsonPath, toJSON(ordered));
  writeFileSync(jsonlPath, ordered.map((r) => JSON.stringify(r)).join('\n') + (ordered.length ? '\n' : ''));

  const hits = ordered.filter((r) => simpleHit(r) === 'true').length;
  const misses = ordered.filter((r) => simpleHit(r) === 'false').length;
  const unknown = ordered.filter((r) => simpleHit(r) === 'unknown').length;

  console.log(`[merge] sources=${sources.length} unique=${map.size} ordered=${ordered.length}/${companies.length}`);
  console.log(`[merge] ket_qua true=${hits} false=${misses} unknown=${unknown}`);
  console.log(`[merge] wrote ${csvPath}`);
  console.log(`[merge] wrote ${csvFullPath}`);
  console.log(`[merge] wrote ${jsonPath}`);
  console.log(`[merge] wrote ${jsonlPath}`);
  return 0;
}

process.exit(main());
