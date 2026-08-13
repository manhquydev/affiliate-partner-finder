---
title: "Phase 3: MutationObserver settle"
status: done
priority: P1
effort: "3-6h"
dependencies: [1]
---

# Phase 3: MutationObserver settle

## Overview

Replace or augment fixed `waitForTimeout` settle with short scroll + MutationObserver window to catch late-injected `<a>` before `runDetector`, under a hard time budget.

## Requirements

- [x] CLI settle helper: scroll steps + MO collecting late anchors OR wait for quiet DOM ≤ budget
- [x] Flag `--lazy-settle` (or config); **default OFF**
- [x] When enabled, settleLazy **replaces** today's `waitForTimeout(1200)` — never stacks on top of it
- [x] Hard budget ≤1200ms by default when flag on (may raise to ≤1500ms only if A7 still holds); must not exceed remaining `DEFAULT_SCAN_BUDGET_MS`
- [x] If A6 (+latency) vs A7 (−throughput) conflict → **prefer A7** (reduce budget / keep flag off)
- [x] Extension may keep simpler sleep initially (document gap) OR share injectable settle snippet

## Related Code Files

- Modify: `cli/browser.ts` (`settle`), `cli/scan.ts`
- Optional: injectable snippet near `cli/injectable.ts` / detector call site
- Pattern source: `aviel-fahl/injected-links` (ideas only; Xia if needed)

## Implementation Steps

1. Implement `settleLazy(page, { budgetMs, scrollPx })`.
2. Gate behind flag; default off or on with same ~1200ms budget as today.
3. Compare link counts on 5 `none@ok` low-link domains (dev sample).

## Todo

- [x] settleLazy implementation
- [x] Flag wiring in `build-scan-argv` / CLI
- [x] Budget tests (fake clock or unit of pure timing helpers)

## Success Criteria

- [x] Flag documented in README CLI section
- [x] Worst-case settle ≤ budget
- [x] No ethics/CAPTCHA interaction

## Cook note

Scaffolding shipped 2026-08-13 — see `plans/reports/cook-260813-phase03-lazy-settle.md`. Default remains OFF; do not enable on live 10k shards without A/B.