---
title: "Phase 3: Playwright adapters collect and scan"
status: todo
phase: 3
effort: "1d"
dependencies: [2]
---

<!-- Updated: Red Team Review 2026-08-10 -->

# Phase 3: Playwright adapters collect and scan

## Overview

Playwright adapters mirroring extension classify flow: Trustpilot collect headed + persistent profile; site scan via `page.evaluate(runDetector)` + `page.evaluate(pathProbe)` then `classify()`. Extract shared `lib/trustpilot-reader.ts`. CF after retries **throws** (never empty success). Mirror `scan.ts` probe try/catch; `maxRetries`; asset abort **OFF** by default.

## Requirements

- [x] Extract `lib/trustpilot-reader.ts` — shared reader for `page.evaluate` (ext + CLI); wire extension collect to use it
- [x] `cli/browser.ts` — collect: `channel: 'chrome'` + `launchPersistentContext` at `~/.cache/affiliate-partner-finder/chrome-profile`; fall back bundled Chromium with warning
- [x] `cli/collect.ts` — headed collect; challenge retries; CF fail ⇒ **throw** / non-zero (never invent companies / empty success)
- [x] `cli/scan.ts` — mirror `lib/scan.ts` stages + probe try/catch isolation; `maxRetries` like run-engine
- [x] Asset abort (`route` image/font/media) **OFF by default**; optional flag only if added later
- [x] loadStatus !== ok ⇒ classify unknown/blocked (never force `none`)

## Architecture

### Browser model

```
Collect: launchPersistentContext(profile, { headless: false, channel: 'chrome' })
Scan:    chromium.launch → newContext() per company (caller concurrency)
try/finally context.close()
```

Profile default: `~/.cache/affiliate-partner-finder/chrome-profile`.

### scanOne CLI flow

```
baseResult defaults
page.goto → settle
det = page.evaluate(runDetector, cfg)
if det.loadStatus === 'ok':
  try { probe = page.evaluate(pathProbe, ...) } catch { isolate like scan.ts }
cls = classify({ loadStatus: det.loadStatus, linkHits, platformHits, pathHits })
// maxRetries on transient failures (mirror run-engine)
```

### collect CLI flow

```
goto trustpilot search
page.evaluate(readTrustpilotSearch)  // from lib/trustpilot-reader.ts
challenge retry loop
paginate until limit
after retries still CF → throw (exit ≠0 upstream)
```

## Related Code Files

- Create: `lib/trustpilot-reader.ts`
- Create: `cli/browser.ts`, `cli/collect.ts`, `cli/scan.ts`
- Modify: `lib/collect.ts` — call shared reader (minimal churn)
- Import: detector, path-probe, classify, types, config
- Do **not** import chrome-bound `lib/scan.ts` from CLI
- Do **not** add stealth / captcha solvers

## Implementation Steps

1. Extract Trustpilot search reader → `lib/trustpilot-reader.ts`; update extension collect imports.
2. `cli/browser.ts`: persistent collect helpers (`channel: 'chrome'`, profile path); scan browser + `withCompanyContext`.
3. `cli/collect.ts`: headed collect + retries; on CF stuck ⇒ throw.
4. `cli/scan.ts`: evaluate detector + pathProbe with try/catch isolation; maxRetries; classify with real loadStatus.
5. Leave asset abort **off** (RT-13).
6. Manual smoke: 1 Trustpilot page + 1–2 golden domains headed.

## Todo

- [x] `lib/trustpilot-reader.ts` + extension wire-up
- [x] Persistent Chrome profile + channel preference
- [x] Collect throws on CF after retries
- [x] Scan: evaluate + probe isolation + maxRetries
- [x] Asset abort default off
- [x] Manual smoke + `npm test` green

## Success Criteria

- [x] Real `Company[]` when session ok
- [x] CF stuck ⇒ clear failure, non-zero upstream, no fake units
- [x] Clear affiliate domain ⇒ affiliate + evidence when load ok
- [x] Timeout/blocked ⇒ unknown/blocked, never `none`
- [x] Extension still builds/tests

## Risk Assessment

| Risk | L×I | Mitigation |
|------|-----|------------|
| CF higher than extension | H | Headed + persistent Chrome channel; throw not empty |
| evaluate serialization | M | Pass plain config objects only |
| Probe CORS / origin | M | Use finalUrl origin like scan.ts |
| Disconnect mid-run | M | Spec'd further in phase 4 |

## Rollback

Delete CLI adapters; keep shared reader only if extension already wired cleanly, else revert reader extract.

## Test plan

- [x] `npm test`
- [x] Manual: collect limit 3 headed
- [x] Manual: scan known affiliate → evidenceUrl
- [x] Manual: low timeout → unknown/blocked not none
- [x] Manual: CF path fails hard (no empty success)

## Validation Log

> `--auto` validation adopts the Decisions section in `plan.md` (and Red Team Review Accept table). Confirm profile path, CF-throw, shared reader, asset abort off before cook.
