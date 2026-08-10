---
title: "Phase 2: Shared core freeze and golden gate"
status: todo
phase: 2
effort: "2-3h"
dependencies: [1]
---

<!-- Updated: Red Team Review 2026-08-10 -->

# Phase 2: Shared core freeze and golden gate

## Overview

Freeze accuracy contract before Playwright I/O. **Purity contract docs only** (RT-16). Do **not** extract `run-helpers` unless an import actually loads chrome at module top. Gate = Vitest classify golden **4/4** affiliate-high + **0 blocked→none**; live smoke mentions `node test/verify-golden.mjs`. No `DETECTOR_VERSION` bump for CLI packaging.

## Requirements

- [x] Purity contract documented (shared vs chrome vs CLI)
- [x] Golden Vitest: **4/4** clear-affiliate-high + **0** blocked→none
- [x] Document live gate: after CLI export covering golden domains, run `node test/verify-golden.mjs` (when network/profile allows)
- [x] DETECTOR_VERSION bump policy: bump only for rule/behavior change — **never** for CLI
- [x] Extract `lib/run-helpers.ts` **only if** chrome bleed blocks Node import; otherwise leave `run-engine` alone
- [x] Extension tests green; no rule-table rewrite

## Architecture

**Shared (Node + ext) — chrome-free:**

| Module | Notes |
|--------|-------|
| `lib/types.ts` | schema |
| `lib/config.ts` | keywords/paths + `DETECTOR_VERSION` |
| `lib/classify.ts` | decision table; blocked→never none (`:17-20`) |
| `lib/detector.ts` | `runDetector` for inject/evaluate |
| `lib/path-probe.ts` | `pathProbe` for inject/evaluate |
| `lib/export.ts` | `toCSV` / `toJSON` |
| `lib/next-data.ts`, `resolve.ts`, `labels.ts`, `messages.ts` | pure / fetch |

**Chrome-only (do not import from CLI):** `lib/scan.ts`, `collect.ts`, `tab-utils.ts`, `storage.ts`, run-engine chrome lock, entrypoints.

**Do not extract by default (RT-16):** `isStale` / pick helpers stay in `run-engine` unless CLI/tests cannot import without chrome.

### DETECTOR_VERSION policy

- Bump when STRONG/WEAK/platforms/paths or classify rows change behavior.
- Do **not** bump for CLI packaging, concurrency, export, or adapters.

### Accuracy claim (RT-1)

- Unit golden = fixture floor (4/4 + blocked→none), **not** live recall ≥90%.
- Live: `verify-golden.mjs` on CLI export when run allows.

## Related Code Files

- Create/Modify: purity note in README CLI section (one place)
- Optional create: `lib/run-helpers.ts` **only if needed**
- Strengthen only if gaps: `test/classify.test.ts`, `test/fixtures/golden.ts`
- Untouched logically: classify / detector / path-probe / export rule bodies

## Implementation Steps

1. Write purity contract bullets (shared / chrome / CLI) + CLI import allowlist.
2. Grep: ensure `cli/` does not import chrome-bound modules.
3. **Only if** chrome bleeds at load: extract pure pick helpers → `lib/run-helpers.ts`; re-export from run-engine; else skip.
4. Audit golden: confirm 4/4 affiliate-high + blocked→none assertions.
5. Document verify-golden live step (README or purity note).
6. Comment / note DETECTOR_VERSION policy (no CLI bump).
7. `npm test`. Freeze: no speed shortcuts until green.

## Todo

- [x] Document purity contract
- [x] Skip run-helpers extract unless chrome bleed proven
- [x] Golden 4/4 + blocked→none as ship-blocker
- [x] Mention `verify-golden.mjs` for live smoke
- [x] DETECTOR_VERSION: no bump for CLI
- [x] `npm test` green

## Success Criteria

- [x] Existing tests pass including golden classify suite (4/4 + 0 blocked→none)
- [x] No unnecessary `run-helpers` file unless required
- [x] Written policy: when DETECTOR_VERSION changes
- [x] Explicit CLI-safe module list in purity note
- [x] No classify decision-table behavior change

## Risk Assessment

| Risk | L×I | Mitigation |
|------|-----|------------|
| Over-extract / big-bang move | M | Docs-first; extract only on bleed (RT-16) |
| Claiming ≥90% from unit fixtures | H | Metric = golden + verify-golden (RT-1) |
| Accidental rule tweak while cleaning | H | Diff classify/detector/path-probe — empty or comment-only |

## Rollback

Revert any optional helper split; keep purity docs if harmless.

## Test plan

- [x] `npm test`
- [x] Confirm golden counts + blocked→none
- [x] Document when to run `node test/verify-golden.mjs`
- [x] Grep: `cli/` must not import `lib/scan|collect|storage|tab-utils`

## Validation Log

> `--auto` validation adopts the Decisions section in `plan.md` (and Red Team Review Accept table). Confirm docs-only P2 / no DETECTOR_VERSION bump for CLI before cook.
