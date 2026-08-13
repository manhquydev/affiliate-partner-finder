// Local CLI batch orchestrator — collect → resolve → scan → JSONL/CSV.

import { mkdirSync, readFileSync, writeFileSync, existsSync, openSync, writeSync, fsyncSync, closeSync, renameSync, unlinkSync } from 'node:fs';
import { join, resolve as pathResolve } from 'node:path';
import pLimit from 'p-limit';
import { CONFIG, DEFAULT_RUN_CONFIG } from '../lib/config';
import { resolve as resolveWebsite } from '../lib/resolve';
import { toCSV, toJSON, toSimpleCSV, simpleHit } from '../lib/export';
import type { Company, ScanResult, RunConfig } from '../lib/types';
import { closeHandle, DEFAULT_PROFILE_DIR, launchPersistentCollect, launchScanSession } from './browser';
import { collectCli } from './collect';
import { scanWithRetry } from './scan';
import { maybeReexecUnderXvfb } from './virtual-display';

type Args = {
  query: string;
  limit: number;
  concurrency: number;
  delayMs: number;
  maxPages: number;
  out: string;
  resume: boolean;
  profile: string;
  headedScan: boolean;
  scanProfile: boolean;
  virtualDisplay: boolean;
  earlyExit: boolean;
  acceptFailures: boolean;
  /** Opt-in MO+scroll settle (replaces fixed 1200ms). Default OFF. */
  lazySettle: boolean;
  /** Opt-in network host evidence (observe request/response). Default OFF. */
  networkEvidence: boolean;
  help: boolean;
};

function printHelp(): void {
  console.log(`Affiliate Partner Finder — local CLI

Usage:
  npm run scan -- --query design --limit 20 --out ./out/run1

Options:
  --query <q>         Trustpilot search query (required)
  --limit <n>         Max companies to collect (default ${DEFAULT_RUN_CONFIG.limit})
  --max-pages <n>     Max Trustpilot search pages to walk (default 40; design ≈1000)
  --concurrency <n>   Parallel site scans 1..3 (default 2)
  --delay-ms <n>      Start-stagger / retry delay (default 1500)
  --out <dir>         Job directory (default ./out/run)
  --resume            Resume from --out (uses companies.json + results.jsonl)
  --profile <dir>     Chrome persistent profile (default ~/.cache/affiliate-partner-finder/chrome-profile)
  --headed-scan       Headed browser for site scans
  --scan-profile      Site scans use the same persistent profile (CF cookies); implies headed
  --virtual-display   Re-exec under Xvfb (headed Chrome off primary screen; keeps CF quality)
  --early-exit        Skip path-probe when homepage already has strong affiliate evidence (default OFF)
  --lazy-settle       Replace fixed 1200ms settle with scroll+MutationObserver (≤1200ms; default OFF)
  --network-evidence  Observe request/response hosts for affiliate platforms (default OFF; method=network)
  --accept-failures   Treat timeout/error rows as terminal on --resume (do not requeue)
  --help              Show help

Ethics: concurrency ≤3, delay ≥1000 recommended. No CAPTCHA bypass.
After CF challenge: complete check once in the persistent profile window, re-run.
For overnight UX: prefer --scan-profile --virtual-display (requires package xvfb).
`);
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    query: '',
    limit: DEFAULT_RUN_CONFIG.limit,
    concurrency: 2,
    delayMs: 1500,
    maxPages: 40,
    out: './out/run',
    resume: false,
    profile: DEFAULT_PROFILE_DIR,
    headedScan: false,
    scanProfile: false,
    virtualDisplay: false,
    earlyExit: false,
    acceptFailures: false,
    lazySettle: false,
    networkEvidence: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i] ?? '';
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--query') args.query = next();
    else if (a === '--limit') args.limit = Math.max(1, Number(next()) || args.limit);
    else if (a === '--max-pages') args.maxPages = Math.max(1, Number(next()) || args.maxPages);
    else if (a === '--concurrency') args.concurrency = Math.min(3, Math.max(1, Number(next()) || 2));
    else if (a === '--delay-ms') args.delayMs = Math.max(0, Number(next()) || args.delayMs);
    else if (a === '--out') args.out = next();
    else if (a === '--resume') args.resume = true;
    else if (a === '--profile') args.profile = next();
    else if (a === '--headed-scan') args.headedScan = true;
    else if (a === '--scan-profile') args.scanProfile = true;
    else if (a === '--virtual-display') args.virtualDisplay = true;
    else if (a === '--early-exit') args.earlyExit = true;
    else if (a === '--lazy-settle') args.lazySettle = true;
    else if (a === '--network-evidence') args.networkEvidence = true;
    else if (a === '--accept-failures') args.acceptFailures = true;
  }
  if (args.scanProfile) args.headedScan = true;
  return args;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function atomicWriteJson(file: string, data: unknown): void {
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2));
  renameSync(tmp, file);
}

/** Single-writer append of one JSONL line + fsync. */
function appendJsonlLine(file: string, obj: unknown): void {
  const line = `${JSON.stringify(obj)}\n`;
  const fd = openSync(file, 'a');
  try {
    writeSync(fd, line);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

function loadResultsMap(jsonlPath: string): Map<string, ScanResult> {
  const map = new Map<string, ScanResult>();
  if (!existsSync(jsonlPath)) return map;
  const text = readFileSync(jsonlPath, 'utf8');
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line) as ScanResult;
      if (row && typeof row.domain === 'string' && row.evidence) {
        map.set(row.domain, row);
      }
    } catch {
      // skip corrupt line
    }
  }
  return map;
}

function isTerminal(r: ScanResult, acceptFailures: boolean): boolean {
  if (r.loadStatus === 'ok' || r.loadStatus === 'blocked') return true;
  // timeout/error: retry on resume unless operator opted into accept-failures.
  return acceptFailures;
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  // Headed Chrome on Xvfb — must run before --help so smoke/`scan:xvfb --help` exercise re-exec.
  maybeReexecUnderXvfb(args.virtualDisplay);
  if (args.help) {
    printHelp();
    return 0;
  }
  if (!args.query && !args.resume) {
    console.error('Missing --query (or use --resume with existing companies.json)');
    printHelp();
    return 2;
  }

  const outDir = pathResolve(args.out);
  mkdirSync(outDir, { recursive: true });
  const companiesPath = join(outDir, 'companies.json');
  const jsonlPath = join(outDir, 'results.jsonl');
  const progressPath = join(outDir, 'progress.json');
  const csvPath = join(outDir, 'results.csv');
  const csvFullPath = join(outDir, 'results.full.csv');
  const jsonPath = join(outDir, 'results.json');
  const stopFlagPath = join(outDir, '.stop');

  let stopRequested = false;
  const requestStop = () => {
    if (stopRequested) return;
    stopRequested = true;
    console.log('[cli] stop requested — finishing in-flight work, then export');
  };
  process.once('SIGINT', requestStop);
  process.once('SIGTERM', requestStop);
  const stopPoll = setInterval(() => {
    if (existsSync(stopFlagPath)) requestStop();
  }, 500);
  stopPoll.unref?.();

  const resultsMap = loadResultsMap(jsonlPath);
  const run: RunConfig = {
    ...DEFAULT_RUN_CONFIG,
    query: args.query || DEFAULT_RUN_CONFIG.query,
    limit: args.limit,
    delayMs: args.delayMs,
  };

  let companies: Company[] = [];
  if (args.resume) {
    if (!existsSync(companiesPath)) {
      console.error('[cli] --resume requires companies.json in --out (snapshot). Do not re-collect.');
      return 2;
    }
    companies = JSON.parse(readFileSync(companiesPath, 'utf8')) as Company[];
    console.log(`[cli] resume: ${companies.length} companies from snapshot; ${resultsMap.size} results on disk`);
  } else {
    if (!args.query) {
      console.error('Missing --query');
      return 2;
    }
    console.log(`[cli] collect query=${args.query} limit=${args.limit} maxPages=${args.maxPages} profile=${args.profile}`);
    const collectHandle = await launchPersistentCollect(args.profile);
    try {
      const skip = new Set(resultsMap.keys());
      companies = await collectCli(
        collectHandle.context,
        args.query,
        args.limit,
        skip,
        args.delayMs,
        args.maxPages,
        {
          onProgress: (partial, pageNum, totalPagesHint) => {
            atomicWriteJson(companiesPath, partial);
            console.log(
              `[cli] checkpoint companies=${partial.length} after page ${pageNum}` +
                (totalPagesHint != null ? ` (tp totalPages≈${totalPagesHint})` : ''),
            );
          },
          shouldStop: () => stopRequested,
        },
      );
      atomicWriteJson(companiesPath, companies);
      console.log(`[cli] collected ${companies.length} companies → ${companiesPath}`);
      if (stopRequested) {
        console.log('[cli] stopped during collect — checkpoint saved, resume safe');
        return 130;
      }
    } catch (e) {
      console.error(`[cli] collect failed: ${e instanceof Error ? e.message : e}`);
      // Keep partial checkpoint if any — continue scanning what we have.
      if (existsSync(companiesPath)) {
        try {
          companies = JSON.parse(readFileSync(companiesPath, 'utf8')) as Company[];
        } catch {
          companies = [];
        }
      }
      if (companies.length === 0) return 1;
      console.warn(`[cli] continuing with partial collect: ${companies.length} companies`);
    } finally {
      await closeHandle(collectHandle);
    }
  }

  if (companies.length === 0) {
    console.error('[cli] no companies to scan');
    return 1;
  }

  const pending = companies.filter((c) => {
    const prev = resultsMap.get(c.domain);
    return !prev || !isTerminal(prev, args.acceptFailures);
  });
  console.log(
    `[cli] scan pending=${pending.length} concurrency=${args.concurrency} earlyExit=${args.earlyExit} lazySettle=${args.lazySettle} networkEvidence=${args.networkEvidence} acceptFailures=${args.acceptFailures} scanProfile=${args.scanProfile}`,
  );

  const session = await launchScanSession({
    headed: args.headedScan,
    profileDir: args.scanProfile ? args.profile : undefined,
  });
  let shuttingDown = false;
  let disconnectFatal = false;
  session.bindDisconnect(() => {
    if (shuttingDown || stopRequested) return;
    disconnectFatal = true;
    console.error('[cli] scan browser disconnected');
  });

  const limit = pLimit(args.concurrency);
  const total = companies.length;

  const writeProgress = () => {
    atomicWriteJson(progressPath, {
      query: run.query,
      total,
      completed: resultsMap.size,
      updatedAt: new Date().toISOString(),
      earlyExit: args.earlyExit,
    });
  };
  writeProgress();

  // Single-flight append queue
  let writeChain: Promise<void> = Promise.resolve();
  const enqueueWrite = (result: ScanResult) => {
    writeChain = writeChain
      .then(() => {
        appendJsonlLine(jsonlPath, result);
        resultsMap.set(result.domain, result);
        writeProgress();
      })
      .catch((err) => {
        console.error('[cli] checkpoint write failed:', err);
        throw err;
      });
    return writeChain;
  };

  try {
    await Promise.all(
      pending.map((company, i) =>
        limit(async () => {
          if (disconnectFatal || stopRequested) return;
          // Start stagger so first wave doesn't blast all navigations at t=0
          await sleep(i * Math.min(args.delayMs, 500));
          if (disconnectFatal || stopRequested) return;
          const websiteUrl = await resolveWebsite(company.domain, run.resolveViaReviewPage);
          console.log(`[cli] scan ${company.domain} → ${websiteUrl}`);
          const result = await scanWithRetry(session, company, websiteUrl, run, CONFIG, {
            earlyExit: args.earlyExit,
            lazySettle: args.lazySettle,
            networkEvidence: args.networkEvidence,
          });
          await enqueueWrite(result);
          console.log(`[cli] done ${company.domain} ${result.verdict}/${result.confidence} (${result.loadStatus})`);
        }),
      ),
    );
  } finally {
    clearInterval(stopPoll);
    await writeChain.catch(() => undefined);
    shuttingDown = true;
    await session.close();
    try {
      if (existsSync(stopFlagPath)) unlinkSync(stopFlagPath);
    } catch {
      /* ignore */
    }
  }

  if (disconnectFatal && !stopRequested) {
    console.error('[cli] aborted due to browser disconnect — re-run with --resume');
    return 1;
  }

  const ordered = companies.map((c) => resultsMap.get(c.domain)).filter((r): r is ScanResult => Boolean(r));
  // last-wins already in map; export unique domains
  const unique = uniqueByDomain(companies, resultsMap, ordered);
  // End-user CSV (true/false/unknown) — primary deliverable for human review.
  writeFileSync(csvPath, toSimpleCSV(unique));
  // Full technical CSV + JSON kept for audit / golden verify.
  writeFileSync(csvFullPath, toCSV(unique));
  writeFileSync(jsonPath, toJSON(unique));
  writeProgress();

  const hits = unique.filter((r) => simpleHit(r) === 'true').length;
  const misses = unique.filter((r) => simpleHit(r) === 'false').length;
  const unknown = unique.filter((r) => simpleHit(r) === 'unknown').length;
  console.log(`[cli] export ${csvPath} (end-user: true=${hits} false=${misses} unknown=${unknown})`);
  console.log(`[cli] export ${csvFullPath}`);
  console.log(`[cli] export ${jsonPath}`);
  console.log(`[cli] completed ${resultsMap.size}/${total}${stopRequested ? ' (stopped early — resume safe)' : ''}`);
  return stopRequested ? 130 : 0;
}

function uniqueByDomain(
  companies: Company[],
  resultsMap: Map<string, ScanResult>,
  ordered: ScanResult[],
): ScanResult[] {
  const fromCompanies = companies.map((c) => resultsMap.get(c.domain)).filter((r): r is ScanResult => Boolean(r));
  return fromCompanies.length ? fromCompanies : ordered.length ? ordered : [...resultsMap.values()];
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
