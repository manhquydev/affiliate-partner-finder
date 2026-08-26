---
title: "Network lazy settle quality track A"
description: "CLI-first network host evidence + budgeted MutationObserver settle to lift false-none / platform recall on loadStatus=ok. Track B (blocked/timeout) is parallel ops only."
status: completed
note: "Code on main (PR #1). A/B measurement deferred to plans/260826-0909 phase-03."
priority: P1
effort: "2-4d"
tags: [quality, network, mutationobserver, playwright, cli]
created: 2026-08-13
blockedBy: []
blocks: []
related:
  - plans/reports/brainstorm-260813-0816-track-abc-quality.md
  - plans/reports/research-260813-0802-ai-crawl-quality-upgrade.md
  - plans/reports/redteam-260813-0810-apf-quality-upgrade-r1.md
  - plans/reports/validate-260813-0810-apf-quality-upgrade-r1.md
  - plans/reports/redteam-260813-0815-apf-quality-upgrade-r2.md
  - plans/reports/validate-260813-0815-apf-quality-upgrade-r2.md
---

# Network lazy settle quality track A

## Overview

Raise **affiliate/platform recall on successfully loaded pages** without touching the running 10k shard job ethics or claiming `unknown%`↓ from DOM/network alone. Live data (n≈3659): `unknown×ok=0`; FN pool = **1739 `none@ok`**; only **12/161** affiliates have `platformHits`.

**Brainstorm lock (C):** Track A = this plan (code). Track B = phase-05 ops notes + parallel Herdr ops — separate KPI.

## Brainstorm contract (accepted)

| Field | Content |
|-------|---------|
| **Outcome** | CLI emits network-derived platform hits + optional lazy settle; measurable lift on ok pages; golden FP=0 |
| **Constraints** | TS+Playwright; concurrency≤3; no CF bypass; observe-only network (no heavy route rewrite); settle budgeted; CLI-first (extension parity later) |
| **Non-goals** | Crawl4AI/browser-use port; LLM-on-unknown; concurrency↑; unknown% as Track A KPI |
| **Acceptance** | Phases 1–4 done + tests green; metrics documented; Track B ops checklist written |

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Types + classify merge for `networkHits` / method=`network` | P1 |
| 2 | CLI `page.on('request'|'response')` host matcher (reuse `isPlatformHost` rules) | P1 |
| 3 | Flagged MutationObserver + scroll settle with time budget | P1 |
| 4 | Unit/golden tests + measurement recipe on `none@ok` sample | P1 |
| 5 | Track B ops runbook (no product code required) | P2 |

## Architecture

```text
page.goto
  ├─(before) attach request/response collectors → networkHosts[]
  ├─ settle: timeout | optional scroll+MutationObserver (budget)
  ├─ runDetector (DOM) → linkHits / platformHits
  ├─ pathProbe (unless early-exit)
  └─ classify(merge DOM + networkHits) → verdict + evidence.method
```

Hook: `cli/scan.ts` / `cli/browser.ts`. Shared host rules: `lib/detector.ts` pattern + `lib/config.ts` `AFFILIATE_PLATFORMS` (+ CDN aliases).

## Baseline metrics (freeze ~2026-08-13)

| Metric | Value |
|--------|------:|
| Coverage | ~3659 / 7465 (~49%) |
| unknown | 1145 (31.3%) = blocked 588 + timeout 530 + error 27 |
| none@ok | 1739 |
| affiliate platformHits nonempty | 12 / 161 (7.5%) |

**Track A KPIs (not unknown%):** ↑ nonempty platform/network hits on ok; lift on labeled `none@ok` sample; golden FP=0.

## Phases

| # | Phase | Status | Depends |
|---|-------|--------|---------|
| 1 | [Contracts & classify merge](./phase-01-start.md) | Done | — |
| 2 | [Network evidence layer](./phase-02-network-evidence-layer.md) | Done | 1 |
| 3 | [MutationObserver settle](./phase-03-mutationobserver-settle.md) | Done | 1 |
| 4 | [Tests golden metrics](./phase-04-tests-golden-metrics.md) | In progress (DONE_PARTIAL — baseline only) | 2,3 |
| 5 | [Ops track B notes](./phase-05-ops-track-b-notes.md) | Done | — (parallel) |

## Success Criteria

- [ ] `networkHits` (or equivalent) folds into classify as high-confidence platform evidence with `method=network`
- [ ] CLI flag(s) to enable settle enhancement; **default OFF**; when on, settle **replaces** fixed `waitForTimeout(1200)` (does not stack)
- [ ] `npm test` green; golden no new false affiliate
- [x] Measurement script/notes for before/after on `none@ok` sample
- [x] Track B ops checklist committed under plans/reports (`ops-260813-track-b-access-runbook.md`)
- [ ] Running design-full-10k shards not modified mid-flight by this work
- [x] Phase-4 metrics report binds R2 A1–A7 (see phase-04)
- [ ] **Ship gate:** Track A MUST NOT claim `unknown%`↓; only A1–A7 / FN-on-ok metrics (unknown% = Track B only)
- [ ] **Throughput priority:** if A6 and A7 conflict, **A7 wins** (tighten settle budget / keep flag off)
- [ ] **Sequencing:** host-matcher unit tests (phase-1/4) green **before** enabling always-on network→classify in resume builds

## Risks

| Risk | Mitigation |
|------|------------|
| Extra settle slows cooling 10k rate | Flag off by default or budget ≤1–2s; A/B |
| Analytics host FP | Strict host-boundary matcher; allowlist platforms/CDNs only |
| Extension parity lag | Document CLI-first; follow-up plan |
| Mixing Track B into same PR | Phase 5 = docs only |

## Evidence

- `plans/reports/brainstorm-260813-0816-track-abc-quality.md`
- Red-team/validate R1+R2 under `plans/reports/*260813-081*`

<!-- slug: network-lazy-settle-quality-track-a -->
