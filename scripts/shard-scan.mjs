#!/usr/bin/env node
/**
 * Split pending scan work from a source --out dir into N shard dirs and optionally launch workers.
 *
 * Usage:
 *   node scripts/shard-scan.mjs --source ./out/design-full-10k --shards 3 --dry-run
 *   node scripts/shard-scan.mjs --source ./out/design-full-10k --shards 3 --auto
 */
import { spawn, execSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  openSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

function printHelp() {
  console.log(`shard-scan — split pending CLI scan work into parallel shard dirs

Options:
  --source <dir>       Source job dir (companies.json + results.jsonl)  [required]
  --shards <n>         Number of shards (default 3)
  --out-base <dir>     Parent for shard-0..N (default <source>-shards)
  --profile-base <dir> Chrome profile prefix (default ~/.cache/affiliate-partner-finder/chrome-profile-shard)
  --concurrency <n>    Per-shard --concurrency (default 2, max 3)
  --delay-ms <n>       Per-shard --delay-ms (default 1000)
  --early-exit         Pass --early-exit to shard workers (sprint mode)
  --accept-failures    Match source resume semantics (default true)
  --no-accept-failures
  --auto               Write .stop to source, wait, then launch shard workers
  --force-stop         After .stop timeout, SIGTERM scan PIDs for --source
  --dry-run            Plan only; do not write or spawn
  --help
`);
}

function parseArgs(argv) {
  const opts = {
    source: '',
    shards: 3,
    outBase: '',
    profileBase: join(homedir(), '.cache', 'affiliate-partner-finder', 'chrome-profile-shard'),
    concurrency: 2,
    delayMs: 1000,
    acceptFailures: true,
    earlyExit: false,
    auto: false,
    forceStop: false,
    dryRun: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i] ?? '';
    if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--source') opts.source = next();
    else if (a === '--shards') opts.shards = Math.max(1, Number(next()) || 3);
    else if (a === '--out-base') opts.outBase = next();
    else if (a === '--profile-base') opts.profileBase = next();
    else if (a === '--concurrency') opts.concurrency = Math.min(3, Math.max(1, Number(next()) || 2));
    else if (a === '--delay-ms') opts.delayMs = Math.max(1000, Number(next()) || 1000);
    else if (a === '--accept-failures') opts.acceptFailures = true;
    else if (a === '--no-accept-failures') opts.acceptFailures = false;
    else if (a === '--early-exit') opts.earlyExit = true;
    else if (a === '--auto') opts.auto = true;
    else if (a === '--force-stop') opts.forceStop = true;
    else if (a === '--dry-run') opts.dryRun = true;
    else throw new Error(`Unknown arg: ${a}`);
  }
  if (opts.help) return opts;
  if (!opts.source) throw new Error('--source is required');
  opts.source = resolve(opts.source);
  if (!opts.outBase) opts.outBase = `${opts.source}-shards`;
  opts.outBase = resolve(opts.outBase);
  return opts;
}

function loadResultsMap(jsonlPath) {
  const map = new Map();
  if (!existsSync(jsonlPath)) return map;
  for (const line of readFileSync(jsonlPath, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line);
      if (row?.domain && row?.evidence) map.set(row.domain, row);
    } catch {
      /* skip */
    }
  }
  return map;
}

function isTerminal(r, acceptFailures) {
  if (r.loadStatus === 'ok' || r.loadStatus === 'blocked') return true;
  return acceptFailures;
}

function shardIndex(domain, n) {
  let h = 2166136261;
  for (let i = 0; i < domain.length; i++) {
    h ^= domain.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % n;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function findScanPids(sourceOut) {
  const needles = [sourceOut, 'design-full-10k'];
  const pids = [];
  try {
    const out = execSync('ps -eo pid=,args=', { encoding: 'utf8' });
    for (const line of out.split('\n')) {
      const t = line.trim();
      if (!t.includes('cli/index.ts')) continue;
      if (!needles.some((n) => t.includes(n))) continue;
      if (t.includes('-shards/shard')) continue;
      const pid = Number.parseInt(t.split(/\s+/)[0], 10);
      if (pid > 0) pids.push(pid);
    }
  } catch {
    /* ignore */
  }
  return [...new Set(pids)];
}

async function requestSourceStop(sourceOut, forceStop) {
  const stopFlag = join(sourceOut, '.stop');
  writeFileSync(stopFlag, new Date().toISOString());
  console.log(`[shard] wrote ${stopFlag} — waiting for source scan to stop…`);

  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const alive = findScanPids(sourceOut).filter((pid) => {
      try {
        process.kill(pid, 0);
        return true;
      } catch {
        return false;
      }
    });
    if (alive.length === 0) {
      console.log('[shard] source scan stopped');
      return;
    }
    await sleep(3000);
  }

  const remaining = findScanPids(sourceOut);
  if (remaining.length === 0) return;

  if (!forceStop) {
    console.warn(
      `[shard] source scan still alive (PIDs ${remaining.join(', ')}) — re-run with --force-stop or stop manually`,
    );
    return;
  }

  for (const pid of remaining) {
    try {
      process.kill(pid, 'SIGTERM');
      console.log(`[shard] SIGTERM ${pid}`);
    } catch {
      /* ignore */
    }
  }
  await sleep(5000);
  for (const pid of remaining) {
    try {
      process.kill(pid, 0);
      process.kill(pid, 'SIGKILL');
      console.log(`[shard] SIGKILL ${pid}`);
    } catch {
      /* ignore */
    }
  }
}

function launchWorker(opts, shardId, outDir, profileDir, count) {
  const logPath = join(outDir, 'run.log');
  const logFd = openSync(logPath, 'a');
  const args = [
    'run',
    'scan',
    '--',
    '--resume',
    '--out',
    outDir,
    '--profile',
    profileDir,
    '--scan-profile',
    '--virtual-display',
    '--concurrency',
    String(opts.concurrency),
    '--delay-ms',
    String(opts.delayMs),
  ];
  if (opts.acceptFailures) args.push('--accept-failures');
  if (opts.earlyExit) args.push('--early-exit');

  const child = spawn('npm', args, {
    cwd: REPO_ROOT,
    detached: true,
    stdio: ['ignore', logFd, logFd],
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  });
  child.unref();
  console.log(`[shard] launched shard-${shardId} pid=${child.pid} companies=${count} out=${outDir}`);
  return { pid: child.pid, logPath };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return 0;
  }

  const companiesPath = join(opts.source, 'companies.json');
  const jsonlPath = join(opts.source, 'results.jsonl');
  if (!existsSync(companiesPath)) {
    console.error(`[shard] missing ${companiesPath}`);
    return 2;
  }

  if (opts.auto && !opts.dryRun) {
    await requestSourceStop(opts.source, opts.forceStop);
  }

  const companies = JSON.parse(readFileSync(companiesPath, 'utf8'));
  const resultsMap = loadResultsMap(jsonlPath);
  const pending = companies.filter((c) => {
    const prev = resultsMap.get(c.domain);
    return !prev || !isTerminal(prev, opts.acceptFailures);
  });

  const buckets = Array.from({ length: opts.shards }, () => []);
  for (const c of pending) {
    buckets[shardIndex(c.domain, opts.shards)].push(c);
  }

  console.log(
    `[shard] source=${opts.source} total=${companies.length} done=${resultsMap.size} pending=${pending.length} shards=${opts.shards}`,
  );
  for (let i = 0; i < opts.shards; i++) {
    console.log(`  shard-${i}: ${buckets[i].length} companies`);
  }

  if (opts.dryRun) {
    console.log('[shard] dry-run — no files written');
    return 0;
  }

  mkdirSync(opts.outBase, { recursive: true });
  const manifest = {
    source: opts.source,
    outBase: opts.outBase,
    createdAt: new Date().toISOString(),
    shards: opts.shards,
    acceptFailures: opts.acceptFailures,
    concurrency: opts.concurrency,
    delayMs: opts.delayMs,
    earlyExit: opts.earlyExit,
    totalCompanies: companies.length,
    completedInSource: resultsMap.size,
    pendingAtSplit: pending.length,
    workers: [],
  };

  for (let i = 0; i < opts.shards; i++) {
    const outDir = join(opts.outBase, `shard-${i}`);
    const profileDir = `${opts.profileBase}-${i}`;
    mkdirSync(outDir, { recursive: true });
    mkdirSync(profileDir, { recursive: true });

    writeFileSync(join(outDir, 'companies.json'), JSON.stringify(buckets[i], null, 2));
    writeFileSync(
      join(outDir, 'shard-meta.json'),
      JSON.stringify(
        {
          shardId: i,
          source: opts.source,
          profileDir,
          companyCount: buckets[i].length,
        },
        null,
        2,
      ),
    );

    const worker = { id: i, out: outDir, profile: profileDir, companies: buckets[i].length };
    if (opts.auto && buckets[i].length > 0) {
      const launched = launchWorker(opts, i, outDir, profileDir, buckets[i].length);
      worker.pid = launched.pid;
      worker.log = launched.logPath;
    }
    manifest.workers.push(worker);
  }

  const manifestPath = join(opts.outBase, 'shard-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`[shard] manifest ${manifestPath}`);

  if (opts.auto) {
    console.log('[shard] workers running — merge when done:');
    console.log(`  npm run shard:merge -- --manifest ${manifestPath}`);
  } else {
    console.log('[shard] to launch workers: re-run with --auto');
  }
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
