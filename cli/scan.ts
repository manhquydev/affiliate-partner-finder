// Site scan via Playwright — mirrors lib/scan.ts semantics (probe isolation + classify).

import type { Page, Request, Response } from 'playwright';
import { classify } from '../lib/classify';
import { runDetector } from '../lib/detector';
import { pathProbe } from '../lib/path-probe';
import { shouldSkipPathProbe } from '../lib/early-exit';
import { NetworkHostCollector } from '../lib/network-collector';
import {
  closeQuietly,
  DEFAULT_CLOSE_TIMEOUT_MS,
  settleForScan,
  type ScanSession,
} from './browser';
import { evaluateInjectable } from './injectable';
import { attachProfileTimings } from './profile-timing';
import { BrowserDeadError, classifyNavFailure } from './nav-failure';
import type {
  Company,
  ScanResult,
  RunConfig,
  Evidence,
  DetectorConfig,
  DetectorResult,
  PathProbeResult,
} from '../lib/types';

/** Hard wall for one company (goto + settle + detector + path-probe). */
export const DEFAULT_SCAN_BUDGET_MS = 120_000;

function baseResult(company: Company, websiteUrl: string, detectorVersion: string): ScanResult {
  return {
    domain: company.domain,
    websiteUrl,
    finalUrl: websiteUrl,
    loadStatus: 'error',
    verdict: 'unknown',
    confidence: 'blocked',
    evidence: {
      linkHits: [],
      platformHits: [],
      pathHits: [],
      junkBaselineStatus: null,
    },
    scannedAt: new Date().toISOString(),
    detectorVersion,
    name: company.name,
    trustScore: company.trustScore,
    reviews: company.reviews,
  };
}

export type ScanCliOptions = {
  earlyExit?: boolean;
  /** Overall per-company wall clock (default 120s). */
  scanBudgetMs?: number;
  /** Per path-probe fetch abort inside page (default 8s). */
  probeFetchTimeoutMs?: number;
  /** Max wait for page/context.close (default 3s). */
  closeTimeoutMs?: number;
  /**
   * When true, MutationObserver + scroll settle replaces fixed 1200ms wait.
   * Default OFF (opt-in; A7 throughput preferred over A6 latency headroom).
   */
  lazySettle?: boolean;
  /** Lazy settle wall (≤1200ms); ignored unless lazySettle. */
  lazySettleBudgetMs?: number;
  /**
   * Opt-in network host evidence: observe request/response URLs and fold
   * matched platforms into classify as networkHits. Default OFF.
   * Observe-only — never uses page.route.
   */
  networkEvidence?: boolean;
  /** Write timingsMs on ScanResult (JSONL and results.json). Default OFF. */
  profileTiming?: boolean;
  /** Parallel path-probe batch (1=sequential, max 3). Default 1. */
  probeParallelBatch?: number;
};

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} exceeded ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/** Attach observe-only request/response listeners; returns detach fn. */
function attachNetworkObservers(page: Page, collector: NetworkHostCollector): () => void {
  const onReq = (req: Request) => collector.addUrl(req.url());
  const onRes = (res: Response) => collector.addUrl(res.url());
  page.on('request', onReq);
  page.on('response', onRes);
  return () => {
    page.off('request', onReq);
    page.off('response', onRes);
  };
}

async function scanOnPage(
  page: Page,
  company: Company,
  websiteUrl: string,
  run: RunConfig,
  cfg: DetectorConfig,
  opts: ScanCliOptions,
): Promise<ScanResult> {
  const result = baseResult(company, websiteUrl, cfg.detectorVersion);
  const probeFetchTimeoutMs = opts.probeFetchTimeoutMs ?? 8000;
  const scanStarted = Date.now();
  const scanBudgetMs = opts.scanBudgetMs ?? DEFAULT_SCAN_BUDGET_MS;
  const networkEvidence = Boolean(opts.networkEvidence);
  const profileTiming = Boolean(opts.profileTiming);
  const probeParallelBatch = opts.probeParallelBatch ?? 1;
  let tGoto = 0;
  let tSettle = 0;
  let tDetector = 0;
  let tProbe = 0;
  const mark = () => (profileTiming ? Date.now() : 0);
  const remainingScanBudgetMs = () => Math.max(0, scanBudgetMs - (Date.now() - scanStarted));

  // Listeners MUST be attached before goto so pixels during navigation are seen.
  const collector = networkEvidence ? new NetworkHostCollector(cfg.platforms) : null;
  const detachNetwork = collector ? attachNetworkObservers(page, collector) : null;

  try {
    const t0 = mark();
    try {
      await page.goto(websiteUrl, { waitUntil: 'domcontentloaded', timeout: run.tabTimeoutMs });
    } catch (e) {
      const kind = classifyNavFailure(e);
      if (kind === 'dead') {
        throw new BrowserDeadError(e instanceof Error ? e.message : String(e));
      }
      result.loadStatus = kind === 'timeout' ? 'timeout' : 'error';
      Object.assign(result, classify({ loadStatus: result.loadStatus }));
      return result;
    } finally {
      if (profileTiming) tGoto = Date.now() - t0;
    }

    const tSettle0 = mark();
    try {
      await settleForScan(page, {
        lazySettle: Boolean(opts.lazySettle),
        lazySettleBudgetMs: opts.lazySettleBudgetMs,
        remainingScanBudgetMs: remainingScanBudgetMs(),
      });
    } finally {
      if (profileTiming) tSettle = Date.now() - tSettle0;
    }

    let det: DetectorResult | undefined;
    const tDet0 = mark();
    try {
      det = await evaluateInjectable(page, runDetector as (...args: never[]) => DetectorResult, cfg);
    } catch {
      det = undefined;
    } finally {
      if (profileTiming) tDetector = Date.now() - tDet0;
    }
    if (!det) {
      result.loadStatus = 'error';
      Object.assign(result, classify({ loadStatus: 'error' }));
      return result;
    }

    const finalUrl = page.url() || websiteUrl;
    let probe: PathProbeResult | undefined;
    /** true when path-probe was attempted but aborted — must not look like a clean empty probe. */
    let probeIncomplete = false;
    // Snapshot network hosts before path-probe so --early-exit can skip when network-only affiliates already matched.
    const networkHits = networkEvidence ? (collector?.matchedPlatforms() ?? []) : [];

    if (det.loadStatus === 'ok') {
      const skipProbe =
        Boolean(opts.earlyExit) &&
        shouldSkipPathProbe({
          loadStatus: det.loadStatus,
          linkHits: det.linkHits,
          platformHits: det.platformHits,
          networkHits,
        });
      if (!skipProbe) {
        try {
          const origin = new URL(finalUrl).origin;
          const probeBudget = Math.min(
            cfg.paths.length * probeFetchTimeoutMs + probeFetchTimeoutMs,
            90_000,
            remainingScanBudgetMs(),
          );
          const tProbe0 = mark();
          try {
            probe = await withTimeout(
              evaluateInjectable(
                page,
                pathProbe as (...args: never[]) => Promise<PathProbeResult>,
                origin,
                cfg.paths,
                probeFetchTimeoutMs,
                probeParallelBatch,
                probeBudget,
              ),
              probeBudget + 1000,
              'pathProbe',
            );
            probeIncomplete = probe.incomplete === true;
          } catch {
            probe = undefined;
            probeIncomplete = true;
          } finally {
            if (profileTiming) tProbe = Date.now() - tProbe0;
          }
        } catch {
          probe = undefined;
          probeIncomplete = true;
        }
      }
    }

    const evidence: Evidence = {
      linkHits: det.linkHits ?? [],
      platformHits: det.platformHits ?? [],
      pathHits: probe?.pathHits ?? [],
      junkBaselineStatus: probe?.junkBaselineStatus ?? null,
      totalLinks: det.totalLinks,
      ...(networkEvidence ? { networkHits } : {}),
    };

    // Incomplete + empty pathHits + no homepage ⇒ unknown (not confident none).
    // Incomplete with pathHits: keep hits and classify (recall). Not stop-on-hit.
    const hasHomepageSignal =
      (evidence.linkHits?.length ?? 0) > 0 ||
      (evidence.platformHits?.length ?? 0) > 0 ||
      (networkEvidence && networkHits.length > 0);
    const emptyIncomplete = probeIncomplete && (evidence.pathHits?.length ?? 0) === 0;
    const loadStatus =
      emptyIncomplete && !hasHomepageSignal && det.loadStatus === 'ok' ? 'timeout' : det.loadStatus;

    const cls = classify({
      loadStatus,
      linkHits: evidence.linkHits,
      platformHits: evidence.platformHits,
      pathHits: evidence.pathHits,
      // Classify merge only when flag on (default OFF — no surprise verdict flips).
      ...(networkEvidence ? { networkHits } : {}),
    });

    result.finalUrl = finalUrl;
    result.loadStatus = loadStatus;
    result.verdict = cls.verdict;
    result.confidence = cls.confidence;
    result.evidence = evidence;
    result.scannedAt = new Date().toISOString();
    return result;
  } finally {
    detachNetwork?.();
    attachProfileTimings(result, profileTiming, scanStarted, {
      goto: tGoto,
      settle: tSettle,
      detector: tDetector,
      probe: tProbe,
    });
  }
}

export async function scanOneCli(
  session: ScanSession,
  company: Company,
  websiteUrl: string,
  run: RunConfig,
  cfg: DetectorConfig,
  opts: ScanCliOptions = {},
): Promise<ScanResult> {
  const budget = opts.scanBudgetMs ?? DEFAULT_SCAN_BUDGET_MS;
  const closeMs = opts.closeTimeoutMs ?? DEFAULT_CLOSE_TIMEOUT_MS;
  const profileTiming = Boolean(opts.profileTiming);
  const startedAt = profileTiming ? Date.now() : 0;
  let page: Page | undefined;
  let ownedContext: { close: () => Promise<unknown> } | undefined;
  try {
    const opened = await session.openPage();
    page = opened.page;
    ownedContext = opened.context;
    return await withTimeout(scanOnPage(page, company, websiteUrl, run, cfg, opts), budget, `scanOne(${company.domain})`);
  } catch (e) {
    if (e instanceof BrowserDeadError) throw e;
    const result = baseResult(company, websiteUrl, cfg.detectorVersion);
    result.loadStatus = classifyNavFailure(e) === 'timeout' ? 'timeout' : 'error';
    Object.assign(result, classify({ loadStatus: result.loadStatus }));
    attachProfileTimings(result, profileTiming, startedAt, {
      goto: 0,
      settle: 0,
      detector: 0,
      probe: 0,
    });
    return result;
  } finally {
    await closeQuietly(page, closeMs);
    await closeQuietly(ownedContext, closeMs);
  }
}

/** Retry timeout/error like lib/run-engine scanList. */
export async function scanWithRetry(
  session: ScanSession,
  company: Company,
  websiteUrl: string,
  run: RunConfig,
  cfg: DetectorConfig,
  opts: ScanCliOptions = {},
): Promise<ScanResult> {
  let last = await scanOneCli(session, company, websiteUrl, run, cfg, opts);
  for (let i = 0; i < run.maxRetries; i++) {
    if (last.loadStatus !== 'timeout' && last.loadStatus !== 'error') break;
    await new Promise((r) => setTimeout(r, run.delayMs));
    last = await scanOneCli(session, company, websiteUrl, run, cfg, opts);
  }
  return last;
}
