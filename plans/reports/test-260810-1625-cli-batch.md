# Test Report — 2026-08-10 16:25 — CLI batch + shared Trustpilot core

**Scope:** Post-implementation QA after local CLI batch scanner (`cli/`, shared `lib/trustpilot-reader.ts`, early-exit).
**Mode:** Required gates from lead (not full coverage run). Diff-aware context: `lib/collect.ts`, new `cli/`, `lib/early-exit.ts`, `lib/trustpilot-reader.ts`, `test/early-exit.test.ts`, package scripts.

## Pass / Fail Matrix

| # | Check | Result | Evidence |
|---|--------|--------|----------|
| 1 | `npm test` | **PASS** | 8 files, **64/64** tests, ~1.61s, exit 0 |
| 2 | `npm run compile` | **PASS** | `tsc --noEmit`, exit 0, no errors |
| 3 | `npm run scan -- --help` | **PASS** | Help text rendered; exit 0 |
| 4 | Golden `verify-golden` on `./out/smoke-auto/results.json` | **SKIP** (file missing) | See §Golden below |
| 5 | `lib/collect.ts` → shared `trustpilot-reader` | **PASS** | Import line 15; CLI also imports same module |
| 5b | Extension unit suite green | **PASS** | Same as #1 (vitest includes extension libs + `early-exit`) |

## Test Results Overview

- **Total**: 64
- **Passed**: 64 | **Failed**: 0 | **Skipped**: 0
- **Duration**: 1.61s
- **Files**: `labels`, `export`, `path-probe`, `early-exit` (3), `classify` (27), `detector-config`, `run-engine`, `detector` (12)

```
✓ test/labels.test.ts (3)
✓ test/export.test.ts (4)
✓ test/path-probe.test.ts (6)
✓ test/early-exit.test.ts (3)
✓ test/classify.test.ts (27)
✓ test/detector-config.test.ts (4)
✓ test/run-engine.test.ts (5)
✓ test/detector.test.ts (12)
Test Files  8 passed | Tests 64 passed
```

## Coverage Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| Vitest coverage | not run | No `test:coverage` script; not requested |
| CLI / Playwright E2E | not in unit suite | No automated CLI integration tests |

## Failed Tests

None.

## Spot-check: CLI help

```
Affiliate Partner Finder — local CLI
Usage: npm run scan -- --query design --limit 20 --out ./out/run1
Options: --query, --limit, --concurrency, --delay-ms, --out, --resume,
         --profile, --headed-scan, --early-exit, --help
Ethics: concurrency ≤3, delay ≥1000 recommended. No CAPTCHA bypass.
```

Exit 0. CLI entry (`tsx cli/index.ts`) wires correctly via `scan` script.

## Golden / smoke-auto (honest)

**`./out/smoke-auto/results.json` does not exist** → `node test/verify-golden.mjs ./out/smoke-auto/results.json` **not executed**.

Present instead:

| Artifact | Status |
|----------|--------|
| `out/smoke-auto/companies.json` | 2 companies (`flinders.nl`, `madeindesign.com`) |
| `out/smoke-auto/results.jsonl` | 2 rows (stream format, not golden JSON array) |
| `out/smoke-auto/progress.json` | `total:2 completed:2 earlyExit:false` |
| `out/smoke-auto/results.json` | **missing** |

Smoke rows (from jsonl):

| domain | verdict | confidence | loadStatus |
|--------|---------|------------|------------|
| www.flinders.nl | unknown | blocked | blocked |
| www.madeindesign.com | unknown | blocked | blocked |

Incomplete vs golden set (13 domains in `test/verify-golden.mjs`). Both sites **CF/load blocked** — cannot validate accuracy floor. Even if jsonl were converted, coverage ≪ golden; verify would report mostly `(missing)`.

## Shared trustpilot-reader confirmation

- `lib/collect.ts:15` — `import { readTrustpilotSearch, type SearchReadResult } from './trustpilot-reader';`
- Extension inject: `chrome.scripting.executeScript({ ..., func: readTrustpilotSearch })`
- `cli/collect.ts:4` — `import { readTrustpilotSearch, type SearchReadResult } from '../lib/trustpilot-reader';`
- CLI inject: `page.evaluate(readTrustpilotSearch)`
- Module chrome-free / self-contained (suited for both inject paths)

## Build Status

- **compile (`tsc --noEmit`)**: PASS
- **Warnings**: npm CLI notices Node 24.5.0 vs supported npm range (env noise, not project fail)
- **wxt build / zip**: not run (not in required gates)

## Critical Issues

1. **No golden gate evidence** — accuracy floor unproven; smoke-auto incomplete + blocked loads.
2. **Artifact shape mismatch** — CLI writes `results.jsonl`; golden verifier expects `results.json` array. Export/aggregate step needed before verify.

## Recommendations

1. **COOK** (not ship) — unit + types + CLI help green; accuracy / live scan path unverified.
2. Re-run smoke with CF-warmed `--profile`, full golden-sized collect, emit `results.json` (or adapter), then `node test/verify-golden.mjs ./out/smoke-auto/results.json`.
3. Add script or CLI finalization step: `results.jsonl` → `results.json` for docs/07 verifier.
4. Optional later: vitest coverage script; 1 smoke integration test (help already covered manually).

## Verdict

| Lane | Status |
|------|--------|
| Unit / compile / CLI wiring | **GREEN** |
| Shared reader refactor | **GREEN** |
| Local accuracy golden | **RED / N/A** (no `results.json`; smoke blocked/incomplete) |
| **Recommendation** | **COOK** — merge-ready for code quality gates only after intentional product decision; **do not ship** as accuracy-complete CLI until golden pass |

## Unresolved Questions

- Does CLI intentionally leave only jsonl, or is results.json export unfinished?
- Was smoke-auto a deliberate n=2 probe, or a failed/aborted full run?
- Profile path: is CF already solved for headed persistent profile on this machine?
