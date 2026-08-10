---
phase: 2
title: "Detector, Path-Probe & Classify Library"
status: pending
priority: P1
effort: "1d"
dependencies: [1]
---

# Phase 2: Detector, Path-Probe & Classify Library

## Overview
The deterministic core. Three pure/near-pure modules — `detector` (in-page DOM
link-scan + bot-block heuristic), `path-probe` (same-origin junk-baseline probe),
`classify` (decision table) — plus Vitest unit tests validated against the golden
set. This phase has NO extension-runtime dependency and is fully unit-testable.

## Requirements
- Functional: reproduce `docs/09` skeleton logic exactly; classify per `docs/05` §6 / `docs/06` §3 decision table.
- Non-functional: deterministic, evidence-first; anti-hallucination guards (soft-404, blocked) are unit-tested.

## Architecture
- `detector.ts` (`runDetector(CONFIG)`): runs inside target page via `chrome.scripting.executeScript`. Reads all `<a>` (text+href), applies strong/weak/platform matching → `linkHits[]` + `platformHits[]`. Bot-block heuristic (`docs/05` §7): title contains any block phrase OR `<a>` count < 5 OR body has "enable javascript and cookies"/"checking your browser" → `loadStatus:'blocked'`.
- `path-probe.ts` (`pathProbe(origin, paths)`): fetch `origin + '/zzq-'+random` → junk baseline status. Probe each path; accept hit only when `status !== junk && status ∈ {200,301,302}`. **Soft-404 guard:** if junk===200 → return `pathHits:[]`. Record `finalUrl`.
- `classify.ts` (`classify(evidence) → {verdict, confidence}`): pure function, decision table below. No I/O.

## Classify Decision Table (from `docs/05` §6 / `docs/06` §3 — authoritative)
| Condition | verdict | confidence |
|---|---|---|
| `loadStatus !== 'ok'` | `unknown` | `blocked` |
| any `linkHit.isStrong` OR `platformHits.length` | `affiliate` | `high` |
| any `pathHit.isStrong` (path matches `/affiliat/`) | `affiliate` | `medium` |
| weak linkHit AND weak pathHit | `partner_trade` | `medium` |
| weak linkHit OR weak pathHit | `partner_trade` | `low` |
| no hits, load ok, junk valid | `none` | `high` |

`isStrong` for a linkHit = matched a `strong` keyword OR a `platform` host.
Note: bare `partner` stays weak unless paired with program/programme/programm or a platform host (`docs/05` §2 note).

## Related Code Files
- Create: `lib/detector.ts` — `runDetector` (self-contained; injectable — no imports of non-inlined config, receives CONFIG as arg).
- Create: `lib/path-probe.ts` — `pathProbe` (async, same-origin fetch).
- Create: `lib/classify.ts` — `classify` (pure).
- Create: `test/classify.test.ts` — decision-table cases + soft-404 + blocked guard.
- Create: `test/detector.test.ts` — jsdom: strong link → hit; weak-only; <5 links → blocked; block-title → blocked.
- Create: `test/fixtures/golden.ts` — golden-set expectations derived from `docs/07` §2 + `docs/data/test-results.json`.

## Implementation Steps
1. Port `runDetector` from `docs/09`; ensure `isStrong = strongKw||platform`; dedupe by href; truncate anchor text to 80 chars.
2. Port `pathProbe` from `docs/09`; keep soft-404 guard (`junk===200 → []`).
3. Write `classify` following the table; add explicit `weak = linkHits.some(h=>!h.isStrong)` and `weakPath = pathHits.length>0`.
4. Load `docs/data/test-results.json`; derive golden expectations into `fixtures/golden.ts`.
5. Unit tests: classify table (6 rows) + soft-404 (junk 200 disables path) + blocked (loadStatus!=ok → never `none`). Detector tests via jsdom DOM fixtures.
6. `vitest run` green; `tsc --noEmit` clean.

## Success Criteria
- [x] `vitest run` all green.
- [x] classify() covers all 6 decision-table rows with a dedicated test each.
- [x] Soft-404 test: junk baseline 200 ⇒ pathHits empty ⇒ no false `affiliate`.
- [x] Blocked test: `loadStatus:'blocked'` ⇒ `unknown/blocked`, NEVER `none`.
- [x] Weak-only (trade/partner) ⇒ `partner_trade`, never upgraded to `affiliate`.

## Risk Assessment
- `executeScript` injected functions cannot close over module imports → `runDetector`/`pathProbe` must be self-contained and receive CONFIG via `args`. Enforced by keeping them import-free (verified in P3 wiring).
- jsdom lacks real `fetch` → path-probe tested with mocked `fetch`; real same-origin behavior verified in P5.
