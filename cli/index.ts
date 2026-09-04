// Local CLI batch orchestrator — collect → resolve → scan → JSONL/CSV.

import { mkdirSync, readFileSync, writeFileSync, existsSync, openSync, writeSync, fsyncSync, closeSync, renameSync, unlinkSync } from 'node:fs';
import { join, resolve as pathResolve } from 'node:path';
import pLimit from 'p-limit';
import { CONFIG, DEFAULT_RUN_CONFIG, maxPagesForLimit } from '../lib/config';
import { clampCollectLimit, type CollectStopReason } from '../lib/collect-pagination.ts';
import { afterCollectAction } from '../lib/after-collect';
import { clampProbeBatchSize } from '../lib/probe-batch';
import { resolve as resolveWebsite } from '../lib/resolve';
import { toCSV, toJSON, toSimpleCSV, simpleHit, toCompaniesCSV } from '../lib/export';
import type { Company, ScanResult, RunConfig } from '../lib/types';
import { assertSafeProfilePath } from '../lib/safe-paths';
import { closeHandle, DEFAULT_PROFILE_DIR, launchPersistentCollect, launchScanSession } from './browser';
import { shouldHideChromeWindows } from './hide-chrome-window';
import { collectCli } from './collect';
import { scanWithRetry } from './scan';
import { firstWaveStaggerMs } from './scan-stagger';
import { BrowserDeadError } from './nav-failure';
import { isUnderVirtualDisplay, maybeReexecUnderXvfb } from './virtual-display';

type Args = {
  query: string;
  limit: number;
  concurrency: number;
  delayMs: number;
  maxPages: number;
  out: string;
  resume: boolean;
  collectOnly: boolean;
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
  /** Opt-in phase timings in JSONL/results.json. Default OFF. */
  profileTiming: boolean;
  probeParallel: boolean;
  probeBatchSize: number;
  help: boolean;
};

function printHelp(): void {
  console.log(`Affiliate Partner Finder — local CLI

Usage:
  npm run scan -- --query design --limit 20 --out ./out/run1

Options:
  --query <q>         Trustpilot search query (required)
  --limit <n>         Max companies to collect (default ${DEFAULT_RUN_CONFIG.limit})
  --max-pages <n>     Max Trustpilot search pages (default: scale with --limit; 20→40, 10000→1000)
  --concurrency <n>   Parallel site scans 1..3 (default 2)
  --delay-ms <n>      Start-stagger / retry delay (default 1500)
  --out <dir>         Job directory (default ./out/run)
  --resume            Resume from --out (uses companies.json + results.jsonl)
  --collect-only      Stop after Trustpilot list; write companies.csv; no site scan
  --profile <dir>     Chrome persistent profile (default ~/.cache/affiliate-partner-finder/chrome-profile)
  --headed-scan       Headed browser for site scans
  --scan-profile      Site scans use the same persistent profile (CF cookies); implies headed
  --virtual-display   Hide headed Chrome off the primary screen (Linux: Xvfb; Windows/macOS: minimized)
  --early-exit        Skip path-probe when homepage already has strong affiliate evidence (default OFF)
  --lazy-settle       Replace fixed 1200ms settle with scroll+MutationObserver (≤1200ms; default OFF)
  --network-evidence  Observe request/response hosts for affiliate platforms (default OFF; method=network)
  --profile-timing    Record per-phase timingsMs in JSONL (default OFF)
  --probe-parallel    Path-probe fetches in parallel batches (default OFF; batch size 3)
  --probe-batch-size  Parallel batch size 1..3 when --probe-parallel (default 3)
  --accept-failures   Treat timeout/error rows as terminal on --resume (do not requeue)
  --help              Show help

Ethics: concurrency ≤3, delay ≥1000 recommended. No CAPTCHA bypass.
After CF challenge: complete check once in the persistent profile window, re-run.
For overnight UX: prefer --scan-profile --virtual-display (Linux: package xvfb; Windows: off-screen headed Chrome).
`);
}

function parseArgs(argv: string[]): Args {
  let maxPagesExplicit = false;
  const args: Args = {
    query: '',
    limit: DEFAULT_RUN_CONFIG.limit,
    concurrency: 2,
    delayMs: 1500,
    maxPages: 40,
    out: './out/run',
    resume: false,
    collectOnly: false,
    profile: DEFAULT_PROFILE_DIR,
    headedScan: false,
    scanProfile: false,
    virtualDisplay: false,
    earlyExit: false,
    acceptFailures: false,
    lazySettle: false,
    networkEvidence: false,
    profileTiming: false,
    probeParallel: false,
    probeBatchSize: 3,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i] ?? '';
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--query') args.query = next();
    else if (a === '--limit') args.limit = clampCollectLimit(Number(next()));
    else if (a === '--max-pages') {
      const n = Number(next());
      if (Number.isFinite(n) && n >= 1) {
        args.maxPages = Math.max(1, Math.trunc(n));
        maxPagesExplicit = true;
      }
    }
    else if (a === '--concurrency') args.concurrency = Math.min(3, Math.max(1, Number(next()) || 2));
    else if (a === '--delay-ms') args.delayMs = Math.max(0, Number(next()) || args.delayMs);
    else if (a === '--out') args.out = next();
    else if (a === '--resume') args.resume = true;
    else if (a === '--collect-only') args.collectOnly = true;
    else if (a === '--profile') args.profile = next();
    else if (a === '--headed-scan') args.headedScan = true;
    else if (a === '--scan-profile') args.scanProfile = true;
    else if (a === '--virtual-display') args.virtualDisplay = true;
    else if (a === '--early-exit') args.earlyExit = true;
    else if (a === '--lazy-settle') args.lazySettle = true;
    else if (a === '--network-evidence') args.networkEvidence = true;
    else if (a === '--profile-timing') args.profileTiming = true;
    else if (a === '--probe-parallel') args.probeParallel = true;
    else if (a === '--probe-batch-size') args.probeBatchSize = clampProbeBatchSize(Number(next()));
    else if (a === '--accept-failures') args.acceptFailures = true;
  }
  if (args.scanProfile) args.headedScan = true;
  if (!maxPagesExplicit) args.maxPages = maxPagesForLimit(args.limit);
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

function writeCompaniesCsv(file: string, companies: Company[]): void {
  if (companies.length === 0) return;
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, toCompaniesCSV(companies));
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
  if (args.resume && args.collectOnly) {
    console.error('[cli] --resume cannot be combined with --collect-only');
    return 2;
  }

  try {
    args.profile = assertSafeProfilePath(args.profile);
  } catch (e) {
    console.error(`[cli] ${e instanceof Error ? e.message : e}`);
    return 2;
  }

  const hideWindows = shouldHideChromeWindows(args.virtualDisplay, process.platform);
  if (hideWindows) {
    console.log('[cli] hiding headed Chrome windows (off-screen / minimized)');
  }

  const outDir = pathResolve(args.out);
  mkdirSync(outDir, { recursive: true });
  const companiesPath = join(outDir, 'companies.json');
  const companiesCsvPath = join(outDir, 'companies.csv');
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
  let collectStopReason: CollectStopReason | undefined;
  if (args.resume) {
    if (!existsSync(companiesPath)) {
      console.error('[cli] --resume requires companies.json in --out (snapshot). Do not re-collect.');
      return 2;
    }
    companies = JSON.parse(readFileSync(companiesPath, 'utf8')) as Company[];
    if (companies.length > 0) writeCompaniesCsv(companiesCsvPath, companies);
    console.log(`[cli] resume: ${companies.length} companies from snapshot; ${resultsMap.size} results on disk`);
  } else {
    if (!args.query) {
      console.error('Missing --query');
      return 2;
    }
    console.log(`[cli] collect query=${args.query} limit=${args.limit} maxPages=${args.maxPages} profile=${args.profile}`);
    const collectHandle = await launchPersistentCollect(args.profile, { hideWindows });
    const writeCollectProgress = (gathered: number) => {
      atomicWriteJson(progressPath, {
        query: args.query,
        total: args.limit,
        completed: gathered,
        updatedAt: new Date().toISOString(),
        earlyExit: false,
        requestedLimit: args.limit,
        phase: 'collect',
        collectStopReason,
      });
    };
    writeCollectProgress(0);
    try {
      const skip = new Set(resultsMap.keys());
      const runCollect = () =>
        collectCli(collectHandle.context, args.query, args.limit, skip, args.delayMs, args.maxPages, {
          onProgress: (partial, pageNum, totalPagesHint) => {
            if (partial.length > 0) {
              atomicWriteJson(companiesPath, partial);
              writeCompaniesCsv(companiesCsvPath, partial);
            }
            writeCollectProgress(partial.length);
            console.log(
              `[cli] checkpoint companies=${partial.length} after page ${pageNum}` +
                (totalPagesHint != null ? ` (tp totalPages≈${totalPagesHint})` : ''),
            );
          },
          onStopReason: (reason) => {
            collectStopReason = reason;
          },
          shouldStop: () => stopRequested,
        });
      try {
        companies = await runCollect();
      } catch (e) {
        console.error(`[cli] collect failed: ${e instanceof Error ? e.message : e}`);
      }
      // Zero companies usually means a WAF/CF challenge. Visible headed Chrome
      // can wait 90s. Hidden Chrome (Xvfb or Windows off-screen) cannot — user
      // must unhide and resume.
      if (companies.length === 0 && !stopRequested) {
        if (isUnderVirtualDisplay() || hideWindows) {
          console.error(
            '[cli] chưa lấy được website và đang chạy ẩn. Tắt tùy chọn "Ẩn cửa sổ Chrome" trong app, bấm Lấy danh sách lại, vượt kiểm tra một lần trong cửa sổ Chrome (cookie lưu lại), rồi bật lại nếu cần ẩn.',
          );
        } else {
          console.error(
            '[cli] chưa lấy được website — cửa sổ Chrome đang mở: nếu thấy kiểm tra Trustpilot/Cloudflare, hãy hoàn thành ngay trong cửa sổ đó (90s).',
          );
          const deadline = Date.now() + 90_000;
          while (Date.now() < deadline && !stopRequested) {
            await new Promise((r) => setTimeout(r, 1000));
          }
          if (!stopRequested) {
            console.log('[cli] collect retry sau khi người dùng có thể vượt kiểm tra…');
            try {
              companies = await runCollect();
            } catch (e) {
              console.error(`[cli] collect retry failed: ${e instanceof Error ? e.message : e}`);
            }
          }
        }
      }
      if (companies.length > 0) {
        atomicWriteJson(companiesPath, companies);
        writeCompaniesCsv(companiesCsvPath, companies);
      }
      console.log(
        companies.length > 0
          ? `[cli] collected ${companies.length} companies → ${companiesPath}`
          : '[cli] collected 0 companies',
      );
      if (stopRequested && companies.length === 0) {
        console.log('[cli] stopped during collect — chưa có website, có thể Lấy danh sách lại');
      }
    } finally {
      await closeHandle(collectHandle);
    }
    const action = afterCollectAction({
      collectOnly: args.collectOnly,
      stopRequested,
      count: companies.length,
    });
    if (action.kind === 'exit') {
      if (companies.length > 0) writeCompaniesCsv(companiesCsvPath, companies);
      if (companies.length === 0 && !stopRequested) {
        console.error(
          args.collectOnly
            ? '[cli] chưa lấy được website — không ghi companies.csv.'
            : '[cli] chưa lấy được website để quét.',
        );
      }
      return action.code;
    }
  }
  if (companies.length === 0) {
    console.error('[cli] chưa lấy được website để quét.');
    return 1;
  }

  const pending = companies.filter((c) => {
    const prev = resultsMap.get(c.domain);
    return !prev || !isTerminal(prev, args.acceptFailures);
  });
  console.log(
    `[cli] scan pending=${pending.length} concurrency=${args.concurrency} earlyExit=${args.earlyExit} lazySettle=${args.lazySettle} networkEvidence=${args.networkEvidence} profileTiming=${args.profileTiming} probeParallel=${args.probeParallel} acceptFailures=${args.acceptFailures} scanProfile=${args.scanProfile}`,
  );

  const session = await launchScanSession({
    headed: args.headedScan,
    profileDir: args.scanProfile ? args.profile : undefined,
    hideWindows,
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
  let requestedLimit = args.resume ? total : args.limit;
  if (args.resume) {
    try {
      const prev = JSON.parse(readFileSync(progressPath, 'utf8')) as {
        requestedLimit?: number;
        collectStopReason?: CollectStopReason;
      };
      if (typeof prev.requestedLimit === 'number' && prev.requestedLimit > 0) {
        requestedLimit = prev.requestedLimit;
      }
      if (prev.collectStopReason && !collectStopReason) collectStopReason = prev.collectStopReason;
    } catch {
      /* first progress write */
    }
  }

  const writeProgress = () => {
    atomicWriteJson(progressPath, {
      query: run.query,
      total,
      completed: resultsMap.size,
      updatedAt: new Date().toISOString(),
      earlyExit: args.earlyExit,
      requestedLimit,
      phase: 'scan',
      collectStopReason,
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
          // First wave only — i * delay over pending=200 was STAGGER_WALL (~5000s).
          await sleep(firstWaveStaggerMs(i, args.concurrency, args.delayMs));
          if (disconnectFatal || stopRequested) return;
          const websiteUrl = await resolveWebsite(company.domain, run.resolveViaReviewPage);
          console.log(`[cli] scan ${company.domain} → ${websiteUrl}`);
          try {
            const result = await scanWithRetry(session, company, websiteUrl, run, CONFIG, {
              earlyExit: args.earlyExit,
              lazySettle: args.lazySettle,
              networkEvidence: args.networkEvidence,
              profileTiming: args.profileTiming,
              probeParallelBatch: args.probeParallel ? args.probeBatchSize : 1,
            });
            await enqueueWrite(result);
            console.log(`[cli] done ${company.domain} ${result.verdict}/${result.confidence} (${result.loadStatus})`);
          } catch (e) {
            if (e instanceof BrowserDeadError) {
              disconnectFatal = true;
              console.error('[cli] scan browser disconnected');
              return;
            }
            throw e;
          }
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
