# Scout: shared-core extract (CLI + Chrome extension)

**SCAN_ROOT:** `/home/manhquy/Downloads/affiliate-partner-finder`  
**Date:** 2026-08-10  
**Thoroughness:** medium  
**Verdict:** Detector logic is already injection-safe and chrome-API-free. The extract boundary is clear: keep pure classify/detect/probe/export/types/config; replace only `scan`/`collect`’s tab + `executeScript` adapters for CLI.

## 1. Pure vs chrome-bound

### Pure / chrome-API-free (safe shared core)

| Path | Notes |
|------|--------|
| `lib/types.ts` | Types only |
| `lib/config.ts` | Keyword/platform/path constants + `CONFIG` / `DEFAULT_RUN_CONFIG` |
| `lib/classify.ts` | Pure decision table |
| `lib/detector.ts` | Uses `document` (DOM). **No `chrome.*`**. Serialized for inject |
| `lib/path-probe.ts` | Uses page `fetch`. **No `chrome.*`**. Serialized for inject |
| `lib/export.ts` | Pure CSV/JSON helpers |
| `lib/next-data.ts` | HTML `__NEXT_DATA__` parse + challenge heuristic |
| `lib/resolve.ts` | `fetch` + `extractNextData` (not chrome) |
| `lib/labels.ts` | VI display maps |
| `lib/messages.ts` | Types/constants only |

**Mixed:**

| Path | Pure part | Chrome-bound part |
|------|-----------|-------------------|
| `lib/detector-config.ts` | `mergeConfig()` | chrome.storage.local I/O |
| `lib/run-engine.ts` | `isStale`, `pickStaleCompanies`, `pickUnscanned` | chrome.storage.session lock |

### Chrome-bound

`lib/tab-utils.ts`, `lib/scan.ts`, `lib/collect.ts`, chrome I/O in detector-config/run-engine, `lib/storage.ts` (idb), `entrypoints/*`.

**Caveat:** detector/path-probe need a real page document (or jsdom). CLI must `page.evaluate` them.

## 2. Import graph (summary)

- detector/classify/path-probe/export → types (+ config for detector-config merge)
- scan → classify, detector, path-probe, tab-utils + chrome
- collect → tab-utils + chrome (inline Trustpilot reader)
- run-engine → collect, resolve, scan, storage + session lock

## 3. Tests that must keep passing

`test/classify.test.ts`, `detector.test.ts`, `path-probe.test.ts`, `export.test.ts`, `detector-config.test.ts`, `run-engine.test.ts`, `labels.test.ts` + `test/fixtures/golden.ts`.

## 4. Smallest extract plan

1. Keep modules in `lib/` with stable paths (no packages/ workspaces unless needed).
2. Split pure helpers from chrome I/O where tests load chrome-coupled files.
3. CLI: Playwright `page.evaluate(runDetector|pathProbe|readTrustpilot)`.
4. Do not rewrite detector/classify rules.

## 5. CLI must replace

| chrome | CLI |
|--------|-----|
| tabs.create/update + waitForComplete | Playwright page.goto + timeouts |
| scripting.executeScript(func) | page.evaluate(func, args) |
| tabs.remove | page.close |
| storage/idb | JSONL checkpoint on disk |

Trustpilot: real browser session required (CF blocks plain fetch).

## 6. Export schema

CSV columns: domain, website, finalUrl, verdict, confidence, loadStatus, evidenceUrl, evidenceText, method, trustScore, reviews, scannedAt.  
JSON: full `ScanResult[]`. See `lib/export.ts`, `lib/types.ts`.
