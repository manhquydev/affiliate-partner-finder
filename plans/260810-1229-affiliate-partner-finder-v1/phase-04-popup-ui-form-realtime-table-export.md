---
phase: 4
title: "Popup UI: Form, Realtime Table, Export"
status: pending
priority: P1
effort: "1d"
dependencies: [3]
---

# Phase 4: Popup UI: Form, Realtime Table, Export

## Overview
Vanilla TS + CSS popup: configure a run (query/limit/delay), Start/Pause, watch a
realtime results table with color-coded verdict badges, open evidence URLs, and
export CSV/JSON. Consumes Phase 3 messaging + IndexedDB.

## Requirements
- Functional: FR-08 (report/export), FR-09 (re-verify open evidence), plus run controls (`docs/08` §5).
- Non-functional: responsive within popup constraints; no external assets (local-only, CSP-safe).

## Architecture
`main.ts` sends `START/PAUSE/RESUME/CLEAR` to background, subscribes to `PROGRESS`
messages, and renders rows incrementally. On open it calls `GET_STATE` and hydrates
from IndexedDB so a reopened popup shows in-flight/completed results. Export reads
full `ScanResult[]` from storage.

## Related Code Files
- Modify: `entrypoints/popup/index.html` — form (query, limit, delayMs), Start/Pause/Clear buttons, Export CSV / Export JSON buttons, results `<table>`, progress line.
- Modify: `entrypoints/popup/main.ts` — messaging, incremental render, verdict badge class map, export handlers, "Open evidence" (`chrome.tabs.create({url:evidenceUrl})`).
- Modify: `entrypoints/popup/style.css` — badge colors: `affiliate`=green, `partner_trade`=amber, `none`=grey, `unknown/blocked`=red; compact table.
- Create: `lib/export.ts` — `toCSV(results)` with columns from `docs/06` §4 (`domain, website, finalUrl, verdict, confidence, loadStatus, evidenceUrl, evidenceText, method, trustScore, reviews, scannedAt`); `toJSON(results)` = full `ScanResult[]`.
- Reuse: `lib/storage.ts`, `lib/types.ts`.

## Implementation Steps
1. Build HTML shell + form + table + buttons.
2. `main.ts`: on load `GET_STATE`; on Start send `START{query,limit,delayMs}`; disable Start while running, enable Pause.
3. Subscribe to `PROGRESS`; upsert table rows by domain; render verdict badge + strongest evidence link (from `evidence.linkHits`/`platformHits`/`pathHits`).
4. `export.ts`: derive strongest hit for CSV `evidenceUrl`/`evidenceText`/`method`; trigger download via Blob + `URL.createObjectURL`.
5. "Open evidence" opens the evidence URL in a new tab (FR-09).
6. Style badges + states; `tsc --noEmit` clean; `wxt build` passes.

## Success Criteria
- [x] Start a run from popup → rows appear incrementally with correct verdict badges.
- [x] Pause/Resume works; Clear resets the run + storage.
- [x] Export CSV has exact columns from `docs/06` §4; every `affiliate` row has a non-empty `evidenceUrl`.
- [x] Export JSON is a full valid `ScanResult[]`.
- [x] "Open evidence" opens the correct URL.
- [x] Reopening the popup mid-run rehydrates current results from IndexedDB.

## Risk Assessment
- Popup closes → messaging listener dies, but background keeps running (persistence in P3); rehydrate on reopen covers this.
- Large result sets: render is incremental and capped by the run `limit`; no virtualization needed for v1 (~20–50 rows) — YAGNI.
- CSV injection / special chars: quote-escape all fields in `toCSV`.
