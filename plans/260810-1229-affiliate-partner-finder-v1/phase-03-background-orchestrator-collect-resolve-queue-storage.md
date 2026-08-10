---
phase: 3
title: "Background Orchestrator: Collect, Resolve, Queue, Storage"
status: pending
priority: P1
effort: "1.5d"
dependencies: [2]
---

# Phase 3: Background Orchestrator: Collect, Resolve, Queue, Storage

## Overview
The MV3 service worker that drives the pipeline: Collect companies from Trustpilot,
Resolve website URLs, run a throttled scan queue (1 tab at a time), persist to
IndexedDB, and emit progress to the popup. Consumes Phase 2's detector/classify.

## Requirements
- Functional: FR-01..FR-07, FR-10 from `docs/02`. Collect via `__NEXT_DATA__`; scan via hidden tab + `executeScript`.
- Non-functional: NFR-01 (ethics/throttle), NFR-02 (evidence/no guess), NFR-04 (local-only), MV3 SW-kill recovery.

## Architecture
```
popup --msg START{query,limit,delayMs}--> background
  collect(query, maxPages)         # fetch /search?query=&page=N, regex __NEXT_DATA__, parse businessUnits[]
  resolve(company)                 # optional: /review/{domain} __NEXT_DATA__ .websiteUrl; fallback https://{domain}
  queue: for each company (serial, delay) -> scanOne()
  scanOne(): tabs.create(active:false) -> waitForComplete(timeout) -> executeScript(runDetector)
             -> if ok: executeScript(pathProbe) -> tabs.remove -> classify -> persist -> emit PROGRESS
  persistence: idb after each company (resume-safe); chrome.alarms poke to survive SW kill
```

## Related Code Files
- Create: `lib/collect.ts` — `collect(query, maxPages, delayMs)`: `fetch('https://www.trustpilot.com/search?query='+q+'&page='+n, {headers:{accept:'text/html'}})`, extract `<script id="__NEXT_DATA__">…</script>` via regex, `JSON.parse`, map `props.pageProps.businessUnits[]` → `{name:displayName, domain:identifyingName, trustScore, reviews:numberOfReviews, trustpilotUrl}`. Stop at limit or `hasMore===false`. 1–2s delay between pages.
- Create: `lib/resolve.ts` — `resolve(domain)`: fetch `/review/{domain}`, parse `businessUnit.websiteUrl`; fallback `https://{domain}`.
- Create: `lib/storage.ts` — `idb` wrapper; stores `companies`, `results`, `config`, `progress` (job cursor). `saveResult`, `getAll`, `getProgress`, `setProgress`, `clearRun`.
- Modify: `entrypoints/background.ts` — message router (`START`/`PAUSE`/`RESUME`/`GET_STATE`/`CLEAR`), scan queue with `delayMs` throttle + `maxRetries` (≤2) + tab timeout, `waitForComplete(tabId, timeout)` via `tabs.onUpdated`, `chrome.alarms` recovery loop, `runtime.sendMessage` progress events.
- Reuse: `lib/detector.ts`, `lib/path-probe.ts`, `lib/classify.ts`, `lib/config.ts`, `lib/types.ts` (Phase 2/1).

## Implementation Steps
1. `collect.ts`: fetch + `__NEXT_DATA__` regex parse; handle bot-check HTML (retry once after short wait); paginate to limit.
2. `resolve.ts`: cheap fallback to `https://{domain}` by default; optional review-page resolve behind a flag.
3. `storage.ts`: open idb v1 with the 4 stores; write result after each company for resume.
4. `background.ts`: implement state machine (`queued→resolving→scanning→done|blocked|error`, `docs/04` §4). Serial queue: at most 1 open scan tab; `delayMs` between companies; retry ≤2 on timeout/error; mark `blocked` (never `none`) on bot-block.
5. Wire detector: `executeScript({func:runDetector, args:[CONFIG]})` then, if `ok`, `executeScript({func:pathProbe, args:[origin, CONFIG.paths]})`; merge evidence → `classify`.
6. `chrome.alarms` (~20s) to resume unfinished queue after SW kill; persist cursor.
7. Emit `PROGRESS` messages; `tsc --noEmit` clean.

## Success Criteria
- [x] `collect("design", 3)` returns ≥20 companies with `domain` populated (manual run in SW console / a thin harness).
- [x] Scan opens at most 1 tab at a time and always closes it (no leaked tabs).
- [x] Delay between companies respects `delayMs` (default 2000ms).
- [x] Bot-blocked site ⇒ persisted as `unknown/blocked`, never `none`.
- [x] Results persist to IndexedDB after each company; run resumes after popup close.
- [x] `tsc --noEmit` clean.

## Risk Assessment
- Trustpilot bot-check / robots: respect it — no `/api/*`, only `/search` HTML that the browser session is allowed to load; retry gently, never bypass Cloudflare (`docs/03` A1/A2). If `/search` returns challenge repeatedly → surface as collect error, do not hammer.
- MV3 SW termination mid-queue: mitigated by per-company idb persistence + `chrome.alarms` resume.
- `<all_urls>` scan of arbitrary sites: keep strictly read-only (no clicks/forms); honor 429 by backing off (`docs/08` §6).
- Async `executeScript` returning a Promise (pathProbe): if unsupported in target, fall back to a single combined async detector (`docs/09` note).
