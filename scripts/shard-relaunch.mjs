#!/usr/bin/env node
/**
 * Relaunch existing shard workers (e.g. after config change) without re-splitting.
 *
 *   node scripts/shard-relaunch.mjs --manifest out/design-full-10k-shards/shard-manifest.json \
 *     --concurrency 3 --early-exit
 */
import { spawn, execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, openSync, unlinkSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs(argv) {
  let manifest = '';
  let concurrency = 3;
  let delayMs = 1000;
  let earlyExit = false;
  let acceptFailures = true;
  let forceStop = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i] ?? '';
    if (a === '--manifest') manifest = next();
    else if (a === '--concurrency') concurrency = Math.min(3, Math.max(1, Number(next()) || 3));
    else if (a === '--delay-ms') delayMs = Math.max(1000, Number(next()) || 1000);
    else if (a === '--early-exit') earlyExit = true;
    else if (a === '--accept-failures') acceptFailures = true;
    else if (a === '--no-accept-failures') acceptFailures = false;
    else if (a === '--force-stop') forceStop = true;
    else throw new Error(`Unknown arg: ${a}`);
  }
  if (!manifest) throw new Error('--manifest required');
  return { manifest: resolve(manifest), concurrency, delayMs, earlyExit, acceptFailures, forceStop };
}

function findShardPids(outDir) {
  const pids = [];
  try {
    const ps = execSync('ps -eo pid=,args=', { encoding: 'utf8' });
    for (const line of ps.split('\n')) {
      if (!line.includes('cli/index.ts') || !line.includes(outDir)) continue;
      const pid = Number.parseInt(line.trim().split(/\s+/)[0], 10);
      if (pid > 0) pids.push(pid);
    }
  } catch {
    /* ignore */
  }
  return [...new Set(pids)];
}

async function stopShard(outDir, forceStop) {
  const stopFlag = join(outDir, '.stop');
  writeFileSync(stopFlag, new Date().toISOString());
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const alive = findShardPids(outDir).filter((pid) => {
      try {
        process.kill(pid, 0);
        return true;
      } catch {
        return false;
      }
    });
    if (alive.length === 0) {
      try {
        unlinkSync(stopFlag);
      } catch {
        /* ignore */
      }
      return;
    }
    await sleep(2000);
  }
  if (!forceStop) {
    console.warn(`[relaunch] shard still running for ${outDir}`);
    return;
  }
  for (const pid of findShardPids(outDir)) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      /* ignore */
    }
  }
  await sleep(4000);
  for (const pid of findShardPids(outDir)) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* ignore */
    }
  }
  try {
    unlinkSync(stopFlag);
  } catch {
    /* ignore */
  }
}

function launchWorker(worker, opts) {
  const logPath = join(worker.out, 'run.log');
  const logFd = openSync(logPath, 'a');
  writeFileSync(
    logPath,
    `\n[relaunch] ${new Date().toISOString()} concurrency=${opts.concurrency} earlyExit=${opts.earlyExit}\n`,
    { flag: 'a' },
  );
  const args = [
    'run',
    'scan',
    '--',
    '--resume',
    '--out',
    worker.out,
    '--profile',
    worker.profile,
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
  console.log(`[relaunch] shard-${worker.id} pid=${child.pid} out=${worker.out}`);
  return child.pid;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const manifest = JSON.parse(readFileSync(opts.manifest, 'utf8'));

  console.log(`[relaunch] stopping ${manifest.workers.length} workers…`);
  for (const w of manifest.workers) {
    await stopShard(w.out, opts.forceStop);
  }

  manifest.concurrency = opts.concurrency;
  manifest.delayMs = opts.delayMs;
  manifest.earlyExit = opts.earlyExit;
  manifest.acceptFailures = opts.acceptFailures;
  manifest.relaunchedAt = new Date().toISOString();

  for (const w of manifest.workers) {
    w.pid = launchWorker(w, opts);
  }

  writeFileSync(opts.manifest, JSON.stringify(manifest, null, 2));
  console.log(`[relaunch] manifest updated ${opts.manifest}`);
  return 0;
}

main()
  .then((c) => process.exit(c))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
