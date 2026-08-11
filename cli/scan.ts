// Site scan via Playwright — mirrors lib/scan.ts semantics (probe isolation + classify).

import type { Page } from 'playwright';
import { classify } from '../lib/classify';
import { runDetector } from '../lib/detector';
import { pathProbe } from '../lib/path-probe';
import { shouldSkipPathProbe } from '../lib/early-exit';
import { closeQuietly, DEFAULT_CLOSE_TIMEOUT_MS, settle, type ScanSession } from './browser';
import { evaluateInjectable } from './injectable';
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

  try {
    await page.goto(websiteUrl, { waitUntil: 'load', timeout: run.tabTimeoutMs });
  } catch {
    result.loadStatus = 'timeout';
    Object.assign(result, classify({ loadStatus: 'timeout' }));
    return result;
  }

  await settle(page, 1200);

  let det: DetectorResult | undefined;
  try {
    det = await evaluateInjectable(page, runDetector as (...args: never[]) => DetectorResult, cfg);
  } catch {
    det = undefined;
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

  if (det.loadStatus === 'ok') {
    const skipProbe = Boolean(opts.earlyExit) && shouldSkipPathProbe(det);
    if (!skipProbe) {
      try {
        const origin = new URL(finalUrl).origin;
        const probeBudget = Math.min(cfg.paths.length * probeFetchTimeoutMs + probeFetchTimeoutMs, 90_000);
        probe = await withTimeout(
          evaluateInjectable(
            page,
            pathProbe as (...args: never[]) => Promise<PathProbeResult>,
            origin,
            cfg.paths,
            probeFetchTimeoutMs,
          ),
          probeBudget,
          'pathProbe',
        );
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
  };

  // Incomplete probe + no homepage signals ⇒ unknown (not confident false).
  // Otherwise path-only programs become ket_qua=false when the probe times out.
  const hasHomepageSignal =
    (evidence.linkHits?.length ?? 0) > 0 || (evidence.platformHits?.length ?? 0) > 0;
  const loadStatus =
    probeIncomplete && !hasHomepageSignal && det.loadStatus === 'ok' ? 'timeout' : det.loadStatus;

  const cls = classify({
    loadStatus,
    linkHits: evidence.linkHits,
    platformHits: evidence.platformHits,
    pathHits: evidence.pathHits,
  });

  result.finalUrl = finalUrl;
  result.loadStatus = loadStatus;
  result.verdict = cls.verdict;
  result.confidence = cls.confidence;
  result.evidence = evidence;
  result.scannedAt = new Date().toISOString();
  return result;
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
  let page: Page | undefined;
  let ownedContext: { close: () => Promise<unknown> } | undefined;
  try {
    const opened = await session.openPage();
    page = opened.page;
    ownedContext = opened.context;
    return await withTimeout(scanOnPage(page, company, websiteUrl, run, cfg, opts), budget, `scanOne(${company.domain})`);
  } catch {
    const result = baseResult(company, websiteUrl, cfg.detectorVersion);
    result.loadStatus = 'timeout';
    Object.assign(result, classify({ loadStatus: 'timeout' }));
    return result;
  } finally {
    // Bounded close — hung page.close must not stall the whole batch for hours.
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
