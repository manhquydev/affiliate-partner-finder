---
title: "Phase 2: Network evidence layer"
status: done
priority: P1
effort: "4-8h"
dependencies: [1]
---

# Phase 2: Network evidence layer

## Overview

In CLI Playwright scan, observe request/response URLs, match affiliate platform/CDN hosts, pass into classify. Observe-only — do not use blanket `page.route` rewrites.

## Requirements

- [x] Attach listeners **before** `page.goto` in CLI scan path
- [x] Match hosts with same boundary rules as detector platforms + optional CDN aliases (e.g. awin/dwin1, impact track hosts)
- [x] **CDN/alias policy:** allowlist only — exact registrable suffix / known tracking hosts from `AFFILIATE_PLATFORMS` + documented aliases; no open-ended substring matching
- [x] Merge into scan result evidence; method=`network`
- [x] Observe collection may be always-on (cheap); **classify merge of networkHits requires matcher unit tests green first** (phase 1). Until then collect-but-do-not-classify OR keep behind `--network-evidence` default off
- [x] Do not kill/restart running 10k shards; new code applies to future/resume processes only when relaunched

## Related Code Files

- Modify: `cli/scan.ts`, `cli/browser.ts` (if context factory)
- Modify: `lib/config.ts` (platform/CDN list)
- Use: phase-1 `lib/network-hosts.ts` + classify
- Non-goal this phase: extension `chrome.webRequest` parity

## Implementation Steps

1. Collector class/functions: addUrl(url), matchedPlatforms().
2. Wire into `scanOnPage` / equivalent.
3. Manual smoke on 3–5 known affiliate sites (dev only).
4. Document flag/env if any.

## Todo

- [x] Collector + wire
- [x] CDN alias table (minimal)
- [x] Smoke notes in phase report

## Success Criteria

- [x] On a demo affiliate page, networkHits nonempty when pixels fire
- [x] Golden / unit still green
- [x] No `page.route('**/*')` for this feature
