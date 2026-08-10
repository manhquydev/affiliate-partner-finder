// Scan one site (docs/04 §3, docs/08 Bước 3): open a background tab, inject the
// detector (layer 1) and — if the page loaded ok — the same-origin path-probe
// (layer 3), then classify. CORS forces the probe to run in-page (docs/03 B1).

import { classify } from './classify';
import { runDetector } from './detector';
import { pathProbe } from './path-probe';
import { sleep, waitForComplete, closeTab } from './tab-utils';
import type {
  Company,
  ScanResult,
  RunConfig,
  Evidence,
  DetectorConfig,
  DetectorResult,
  PathProbeResult,
} from './types';

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

/** Scan a single company's website and return a fully classified ScanResult.
 * `cfg` is the effective detector config (default + any user override). */
export async function scanOne(
  company: Company,
  websiteUrl: string,
  run: RunConfig,
  cfg: DetectorConfig,
): Promise<ScanResult> {
  const result = baseResult(company, websiteUrl, cfg.detectorVersion);
  let tabId: number | undefined;

  try {
    const tab = await chrome.tabs.create({ url: websiteUrl, active: false });
    tabId = tab.id;
    if (tabId === undefined) {
      result.loadStatus = 'error';
      return result;
    }

    const loaded = await waitForComplete(tabId, run.tabTimeoutMs);
    if (loaded === 'timeout') {
      await closeTab(tabId);
      result.loadStatus = 'timeout';
      // timeout ⇒ unknown/blocked (never 'none')
      Object.assign(result, classify({ loadStatus: 'timeout' }));
      return result;
    }

    // Small settle delay so late-rendering SPAs populate the DOM before scanning.
    await sleep(700);

    const [detWrap] = await chrome.scripting.executeScript({
      target: { tabId },
      func: runDetector,
      args: [cfg],
    });
    const det = detWrap?.result as DetectorResult | undefined;
    if (!det) {
      await closeTab(tabId);
      result.loadStatus = 'error';
      Object.assign(result, classify({ loadStatus: 'error' }));
      return result;
    }

    // finalUrl (after redirects) drives the path-probe origin.
    let finalUrl = websiteUrl;
    try {
      const t = await chrome.tabs.get(tabId);
      finalUrl = t.url || websiteUrl;
    } catch {
      /* keep websiteUrl */
    }

    let probe: PathProbeResult | undefined;
    if (det.loadStatus === 'ok') {
      // Isolate probe failures: if the probe throws (navigation, CSP, tab gone)
      // we degrade to link/platform evidence only — we must NOT discard a
      // confirmed detector result by falling through to the outer catch.
      try {
        const origin = new URL(finalUrl).origin;
        const [probeWrap] = await chrome.scripting.executeScript({
          target: { tabId },
          func: pathProbe,
          args: [origin, cfg.paths],
        });
        probe = probeWrap?.result as PathProbeResult | undefined;
      } catch {
        probe = undefined;
      }
    }

    await closeTab(tabId);

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
    await closeTab(tabId);
    result.loadStatus = 'error';
    Object.assign(result, classify({ loadStatus: 'error' }));
    return result;
  }
}
