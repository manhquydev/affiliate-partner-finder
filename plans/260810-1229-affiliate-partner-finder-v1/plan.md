---
title: "Affiliate Partner Finder v1"
description: "MV3 Chrome extension: collect Trustpilot companies, scan sites for affiliate/partner programs with evidence, export CSV/JSON. Rule-based, no AI."
status: in-progress
priority: P1
effort: "3-5d"
tags: [chrome-extension, mv3, wxt, typescript]
created: 2026-08-10
---

# Affiliate Partner Finder v1

## Overview

Build v1 of the Affiliate/Partner Program Finder — a Manifest V3 Chrome extension
that (1) collects companies from Trustpilot by query, (2) resolves each website
URL, (3) scans each site via a 3-layer detector (link-scan multilingual +
affiliate-platform outbound + path-probe with junk baseline), (4) classifies into
`affiliate` / `partner_trade` / `none` / `unknown` with evidence, and exports
CSV/JSON. Rule-based, deterministic, evidence-first — **no AI in v1**.

**Source of truth:** `./docs` (01–11), browser-verified. This plan does NOT
re-derive keyword/platform/path lists or the classify decision table — it points
to `docs/05-detector-spec.md` and `docs/06-data-schema.md`. Stack: WXT +
TypeScript, vanilla TS/CSS popup, IndexedDB via `idb`, Vitest unit tests
(`docs/11-tech-stack.md`).

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Deterministic 3-layer detector + classify matching golden set (`docs/07`) | P1 |
| 2 | Anti-hallucination: never treat `blocked` as `none`; every verdict carries evidence | P1 |
| 3 | End-to-end pipeline (collect→resolve→scan→report→export) runnable on query "design" | P1 |
| 4 | Ethical guardrails: 1 tab at a time, 1–3s delay, no CAPTCHA/Cloudflare bypass, local-only | P1 |
| 5 | Maintainable: keyword/path/platform config isolated; typed schema (`NFR-05`) | P2 |

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Phase 1: Scaffold, Manifest, Types & Config](./phase-01-start.md) | Completed |
| 2 | [Phase 2: Detector, Path-Probe & Classify Library](./phase-02-detector-path-probe-classify-library.md) | Completed |
| 3 | [Phase 3: Background Orchestrator: Collect, Resolve, Queue, Storage](./phase-03-background-orchestrator-collect-resolve-queue-storage.md) | Completed |
| 4 | [Phase 4: Popup UI: Form, Realtime Table, Export](./phase-04-popup-ui-form-realtime-table-export.md) | Completed |
| 5 | [Phase 5: End-to-End Verification vs Golden Set](./phase-05-end-to-end-verification-vs-golden-set.md) | Tooling done — live run pending (manual) |

## Dependency Flow

```
P1 (scaffold + types + config)
  └─> P2 (detector/path-probe/classify — pure, unit-testable)
        └─> P3 (background: collect/resolve/scan queue/storage — consumes P2)
              └─> P4 (popup UI — consumes P3 messaging + storage)
                    └─> P5 (e2e verification vs golden set + guardrail audit)
```
P2 has no runtime browser dependency → fully unit-testable in isolation (Vitest).

## Success Criteria (Acceptance)

- [x] `wxt build` produces a loadable MV3 extension (`.output/chrome-mv3`).
- [x] Vitest: classify() decision table (`docs/05` §6) + soft-404 guard + blocked-guard + export all pass (44 tests green).
- [x] Golden-set match at the classify level (`test/fixtures/golden.ts`): 4/4 affiliate-high correct, 0 blocked→none, 0 false-affiliate on 5 none cases.
- [x] Guardrails implemented in code (max 1 scan tab via loopRunning guard, configurable delay default 2s, ≤2 retries on timeout/error only, no login/form/CAPTCHA bypass, local-only).
- [ ] LIVE (manual gate): end-to-end on "design" shows ≥20 companies; CSV+JSON export; each `affiliate` row has reachable `evidenceUrl`; golden verdicts match on real sites; guardrails observed in a real run. Run: load unpacked → export JSON → `node test/verify-golden.mjs <json> --check-urls`.

## Non-Goals (v1)

Login/form-submit on target sites; CAPTCHA/Cloudflare bypass; AI semantic
classification (v2, `docs/10`); full-site crawl; any external server.

<!-- slug: affiliate-partner-finder-v1 -->
