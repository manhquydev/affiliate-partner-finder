// Site scan via Playwright — mirrors lib/scan.ts semantics (probe isolation + classify).

import type { Browser } from 'playwright';
import { classify } from '../lib/classify';
import { runDetector } from '../lib/detector';
import { pathProbe } from '../lib/path-probe';
import { shouldSkipPathProbe } from '../lib/early-exit';
import { newScanContext, settle } from './browser';
import type {
  Company,
  ScanResult,
  RunConfig,
  Evidence,
  DetectorConfig,
  DetectorResult,
  PathProbeResult,
} from '../lib/types';

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
};

/** Playwright evaluate accepts one arg — invoke multi-arg injectables via toString. */
async function evaluateInjectable<T>(
  page: import('playwright').Page,
  fn: (...args: never[]) => T,
  ...args: unknown[]
): Promise<T> {
  const expr = `(${fn.toString()}).apply(null, ${JSON.stringify(args)})`;
  return page.evaluate(expr) as Promise<T>;
}

export async function scanOneCli(
  browser: Browser,
  company: Company,
  websiteUrl: string,
  run: RunConfig,
  cfg: DetectorConfig,
  opts: ScanCliOptions = {},
): Promise<ScanResult> {
  const result = baseResult(company, websiteUrl, cfg.detectorVersion);
  const context = await newScanContext(browser);
  const page = await context.newPage();

  try {
    try {
      await page.goto(websiteUrl, { waitUntil: 'domcontentloaded', timeout: run.tabTimeoutMs });
    } catch {
      result.loadStatus = 'timeout';
      Object.assign(result, classify({ loadStatus: 'timeout' }));
      return result;
    }

    await settle(page, 700);

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

    if (det.loadStatus === 'ok') {
      const skipProbe = Boolean(opts.earlyExit) && shouldSkipPathProbe(det);
      if (!skipProbe) {
        try {
          const origin = new URL(finalUrl).origin;
          probe = await evaluateInjectable(
            page,
            pathProbe as (...args: never[]) => PathProbeResult,
            origin,
            cfg.paths,
          );
        } catch {
          probe = undefined;
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
    const cls = classify({
      loadStatus: det.loadStatus,
      linkHits: evidence.linkHits,
      platformHits: evidence.platformHits,
      pathHits: evidence.pathHits,
    });

    result.finalUrl = finalUrl;
    result.loadStatus = det.loadStatus;
    result.verdict = cls.verdict;
    result.confidence = cls.confidence;
    result.evidence = evidence;
    result.scannedAt = new Date().toISOString();
    return result;
  } catch {
    result.loadStatus = 'error';
    Object.assign(result, classify({ loadStatus: 'error' }));
    return result;
  } finally {
    await page.close().catch(() => undefined);
    await context.close().catch(() => undefined);
  }
}

/** Retry timeout/error like lib/run-engine scanList. */
export async function scanWithRetry(
  browser: Browser,
  company: Company,
  websiteUrl: string,
  run: RunConfig,
  cfg: DetectorConfig,
  opts: ScanCliOptions = {},
): Promise<ScanResult> {
  let last = await scanOneCli(browser, company, websiteUrl, run, cfg, opts);
  for (let i = 0; i < run.maxRetries; i++) {
    if (last.loadStatus !== 'timeout' && last.loadStatus !== 'error') break;
    await new Promise((r) => setTimeout(r, run.delayMs));
    last = await scanOneCli(browser, company, websiteUrl, run, cfg, opts);
  }
  return last;
}
