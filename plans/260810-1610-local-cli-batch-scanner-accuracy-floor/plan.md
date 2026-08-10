---
title: "Local CLI batch scanner accuracy floor"
description: "Local Playwright CLI: shared detector/classify, Trustpilot collect, concurrent scan (≤3), companies snapshot + JSONL resume, CSV/JSON export. Accuracy floor via classify golden + verify-golden. DeepSeek deferred out of this plan."
status: completed
priority: P1
effort: "3-4d"
branch: main
tags: [cli, playwright, batch, local]
created: 2026-08-10
blockedBy: []
related: [260810-1229-affiliate-partner-finder-v1]
---

# Local CLI batch scanner accuracy floor

## Overview

Ship a **local Node CLI** that batch-collects Trustpilot companies and scans sites with the **same** `runDetector` / `pathProbe` / `classify` core as the Chrome MV3 extension. Bounded Playwright concurrency (default 2, max 3), **companies snapshot** + JSONL + `progress.json` resume, CSV/JSON via existing `lib/export.ts`. Accuracy floor: Vitest classify golden (4/4 affiliate-high, 0 blocked→none) + CLI export through `node test/verify-golden.mjs` before enabling speed shortcuts. Never map blocked → none.

**Soft-related** to `plans/260810-1229-affiliate-partner-finder-v1` (~79% done). New plan does **not** hard-`blockedBy` v1. Do not edit v1 plan files.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Local CLI: collect → resolve → scan → export; extension keeps working | P1 |
| 2 | Same classify/detector semantics as extension (`page.evaluate` + probe isolation + maxRetries) | P1 |
| 3 | Gate: classify golden 4/4 + 0 blocked→none; verify-golden on CLI export when live smoke run | P1 |
| 4 | Concurrency 2 (max 3) + start-stagger delay; companies.json + JSONL resume; CSV/JSON evidence | P1 |
| 5 | Optional early-exit path-probe (**default OFF**); throughput bench stretch (≥3× not hard gate) | P2 |

## Non-goals

- Cloud browser fleet / multi-tenant SaaS / live LLM in this plan (DeepSeek → follow-up plan)
- Electron/Tauri shell
- CAPTCHA bypass / stealth plugins
- Full detector rewrite / cheerio scrape rewrite
- SQLite / monorepo workspaces / domain-day HTML cache / dual `tsconfig.cli` ceremony
- Making AI primary detector
- Default-on early-exit or asset-abort that changes observation vs extension

## Architecture

```
cli/index.ts  →  collect (headed/persistent) → resolve → scan (p-limit) → JSONL/CSV
                      │                              │
                      ▼                              ▼
              cli/browser.ts                   page.evaluate(runDetector)
              cli/collect.ts                   page.evaluate(pathProbe)
                      │                              │
                      └──────── shared lib/ ─────────┘
                 classify, detector, path-probe, export, types, config
```

| Layer | Path | Role |
|-------|------|------|
| Pure core (untouched logically) | `lib/classify.ts`, `detector.ts`, `path-probe.ts`, `export.ts`, `types.ts`, `config.ts` | Same verdicts/evidence |
| Chrome-bound (leave for extension) | `lib/scan.ts`, `collect.ts`, `tab-utils.ts`, `storage.ts`, `run-engine.ts` chrome lock | Extension only |
| CLI adapters | `cli/browser.ts`, `collect.ts`, `scan.ts`, `index.ts` | Playwright I/O |
| Checkpoint | `<out>/companies.json`, `<out>/results.jsonl`, `<out>/progress.json` | Resume cohort + domain skip |
| Gate | `test/*.test.ts`, `golden.ts`, `test/verify-golden.mjs` | Accuracy floor |

**Data flow:** Trustpilot search HTML/`__NEXT_DATA__` → `Company[]` → website URL → in-page detector + optional path-probe → `classify()` → `ScanResult` → append JSONL → `toCSV`/`toJSON`.

**Critical invariant:** `classify` row 1 (`lib/classify.ts:17-20`) — `loadStatus !== 'ok'` ⇒ `unknown`/`blocked`, never `none`. CLI must pass real `loadStatus` from detector, not invent `ok`.

## Phases

| # | Phase | Effort | Deps | Status |
|---|-------|--------|------|--------|
| 1 | [Start — deps, exclude cli from root tsc, scripts, cli/ skeleton](./phase-01-start.md) | 2-3h | — | Pending |
| 2 | [Shared core freeze + golden gate](./phase-02-shared-core-freeze-and-golden-gate.md) | 2-3h | 1 | Pending |
| 3 | [Playwright adapters collect + scan](./phase-03-playwright-adapters-collect-and-scan.md) | ~1d | 2 | Pending |
| 4 | [CLI orchestrator checkpoint CSV](./phase-04-cli-orchestrator-checkpoint-csv.md) | ~1d | 3 | Pending |
| 5 | [Optional early-exit (off) + throughput bench](./phase-05-early-exit-cache-throughput-bench.md) | 0.5d | 4 | Pending |
| 6 | [DEFERRED DeepSeek ambiguous label](./phase-06-optional-deepseek-ambiguous-label.md) | — | — | Cancelled |

## Dependency graph

```
1 → 2 → 3 → 4 → 5 (optional stretch)
6 CANCELLED this plan — follow-up after MVP floor
```

## Backwards compatibility

- Extension: zero intentional change to detector rules; pure helpers may move to new files but export surface of `classify`/`runDetector`/`pathProbe`/`toCSV`/`toJSON` stays.
- `DETECTOR_VERSION` (`lib/config.ts:108`) only bumps when rule lists/behavior change — not for CLI packaging.
- CSV columns (`lib/export.ts:48-61`) stay stable; AI fields optional extras or side columns only (phase 6).

## Test matrix

| Level | What |
|-------|------|
| Unit | Existing classify/detector/path-probe/export/golden; pure pick helpers if split |
| Integration | CLI dry adapters with fixture HTML / mocked evaluate (optional) |
| Manual E2E | Small Trustpilot query `--limit 5`; kill mid-run → resume; export openable evidenceUrl |
| Gate | `npm test` green before speed (phase 5) and before AI (phase 6) |
| Bench | Same query+limit: CLI wall time vs extension serial (phase 5) |

## Rollback

| Phase | Rollback |
|-------|----------|
| 1 | Revert package.json / remove cli + tsconfig.cli; uninstall deps |
| 2 | Revert helper splits; keep golden; restore imports |
| 3–4 | Delete `cli/*` usage; extension unchanged |
| 5 | Feature-flag early-exit/cache off; restore always-path-probe |
| 6 | Default flag off; remove `cli/ai.ts`; strip optional fields |

## Risks (plan-level)

| Risk | L×I | Mitigation |
|------|-----|------------|
| CF blocks Trustpilot headless | H | Headed + `launchPersistentContext`; fail clear, never invent companies |
| Concurrency spikes site blocks | M | Default concurrency 2, max 3, delayMs ≥1000 |
| Accidental chrome import in CLI | M | Root `exclude: ["cli"]`; purity doc; never import chrome-bound modules |
| Dual-surface drift (ext vs CLI) | M | Shared evaluate of same funcs; extract Trustpilot reader once; no fork |
| Throughput claim unmeasured | M | Phase 5 stretch only; accuracy + resume are hard gates |

## Success Criteria (plan)

- [ ] `npm test` green; `npm run compile` green; extension still builds
- [ ] `npm run scan -- --query … --limit N` → CSV/JSON with evidence; CF collect fail ⇒ non-zero exit
- [ ] Resume: load `companies.json`, skip domains with terminal results in JSONL; no silent re-collect
- [ ] Classify golden: 4/4 affiliate-high; 0 blocked→none (do **not** claim ≥90% from unit fixtures alone)
- [ ] After a live/smoke CLI export covering golden domains: `node test/verify-golden.mjs` passes (when network/profile allows)
- [ ] Confirmed affiliate rows have openable evidenceUrl (spot-check)
- [ ] No cloud LLM / CAPTCHA-bypass deps in this plan
- [ ] Phase 6 DeepSeek deferred (not part of ship gate)

## References

- Advise: `plans/reports/advise-260810-1600-batch-local-accuracy.md`
- Research: `plans/reports/research-260810-1610-playwright-cli-local.md`
- Scout: `plans/reports/scout-260810-1610-shared-core-extract.md`
- Core: `lib/scan.ts:43-141`, `lib/classify.ts:9-50`, `lib/export.ts:72-97`

## Decisions (validation / red-team --auto)

- Trustpilot profile default: `~/.cache/affiliate-partner-finder/chrome-profile`
- Prefer `channel: 'chrome'` for collect; fall back to bundled Chromium with clear warning
- Live smoke: golden domains via `verify-golden.mjs` when run locally; CI may skip live net
- Early-exit default **OFF**; asset abort default **OFF**
- DeepSeek: **out of this plan** (user API noted for follow-up)

## Red Team Review

Date: 2026-08-10 | Mode: --auto apply accepted | Reviewers: Security, Failure, Assumption, Scope

### Findings applied (Accept)

| ID | Severity | Summary | Plan delta |
|----|----------|---------|------------|
| RT-1 | Critical | Vitest golden ≠ live recall ≥90% | Rename metric; add verify-golden gate |
| RT-2 | Critical | Root tsc includes `cli/` | Phase 1: `exclude: ["cli"]` on root; drop dual-tsconfig ceremony |
| RT-3 | High | Missing maxRetries vs `run-engine` | Spec retries in P3/P4 |
| RT-4 | Critical | Resume re-collects; no company snapshot | `companies.json` after collect; resume from snapshot |
| RT-5 | Critical | Concurrent JSONL write races | Single-writer queue + fsync; skip any bad line |
| RT-6 | High | Error lines break `toCSV` | Always write ScanResult-shaped rows (`baseResult` style) |
| RT-7 | High | CF → empty success | CF after retries ⇒ throw / exit ≠0 |
| RT-8 | High | Copy Trustpilot reader | Extract shared `lib/trustpilot-reader.ts` |
| RT-9 | High | ≥3× fights ethics caps | Stretch metric only |
| RT-10 | High | Domain-day cache YAGNI | Removed from plan |
| RT-11 | High | Early-exit default on / parity | Default OFF; always path-probe for MVP |
| RT-12 | Critical | DeepSeek same-plan + cloud | Phase 6 cancelled this plan |
| RT-13 | High | Probe isolation / asset abort | Mirror `scan.ts` try/catch; abort assets off |
| RT-14 | High | AI after checkpoint / export dupes | N/A for deferred AI; export last-wins Map |
| RT-15 | Med | Browser disconnect / delay stagger | Spec in P3/P4 |
| RT-16 | Med | No run-helpers extract | P2 docs-only unless import fails |

### Rejected

| ID | Rationale |
|----|-----------|
| Soft “keep DeepSeek P3 in success” | Conflicts advise local/no-cloud this phase + YAGNI |

### Whole-Plan Consistency Sweep

- Searched plan for DeepSeek-as-ship-gate, domain-day cache, ≥90% from unit golden, tsconfig.cli-as-isolation, early-exit-default-on — updated or cancelled.
- Unresolved contradictions: none remaining for cook MVP (phases 1–4 + light 5).

<!-- slug: local-cli-batch-scanner-accuracy-floor -->
