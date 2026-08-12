---
phase: 2
title: "Job runner adapter TDD"
status: pending
priority: P1
effort: "4-6h"
dependencies: [1]
---

# Phase 2: Job runner adapter TDD

## Overview

Pure Node modules that build CLI argv, read `progress.json`, and count `ket_qua` from `results.jsonl` using `simpleHit`. Tests first.

## Requirements

- Functional: buildArgv; readProgress; countKetQua from jsonl; default Windows profile path helper
- Non-functional: no Playwright in unit tests; deterministic Vitest

## Architecture

```text
buildScanArgv(opts) → string[]
readProgress(outDir) → ProgressSnapshot | null
countKetQuaFromJsonl(path) → { true, false, unknown }
defaultDesktopProfileDir() → path (LOCALAPPDATA on win32 else ~/.cache/...)
```

Spawn/kill stays in phase 4 (Electron main).

## Related Code Files

- Create: `desktop/build-scan-argv.ts`, `desktop/progress.ts`, `desktop/ket-qua-counts.ts`, `desktop/profile-path.ts`
- Create: `test/desktop-adapter.test.ts`
- Modify: none of `cli/` unless a tiny export of progress type is cleaner — **prefer duplicate type mirror** to avoid CLI churn
- Reuse: `lib/export.ts` `simpleHit`, `ScanResult` from `lib/types.ts`

## File inventory

| Path | Action |
|------|--------|
| `desktop/build-scan-argv.ts` | Create |
| `desktop/progress.ts` | Create |
| `desktop/ket-qua-counts.ts` | Create |
| `desktop/profile-path.ts` | Create |
| `test/desktop-adapter.test.ts` | Create |

## Tests Before (TDD)

1. `buildScanArgv` includes `--scan-profile`, `--out`, concurrency clamp 1..3, **delayMs clamp ≥1000**
2. On win32 simulation: never `--virtual-display`; **always** `--profile` abs
3. `readProgress` parses fixture; null if missing
4. `countKetQuaFromJsonl` via simpleHit; **skip truncated last line**
5. `defaultDesktopProfileDir` uses LOCALAPPDATA on win32
6. `assertSafeJobPaths` rejects Chrome User Data
7. `writeSimpleCsvFromJsonl` + `canStartFresh` guards
8. Soft-stop: CLI SIGINT drains writes (phase 4 dependency — small CLI change allowed)

## Refactor / Implement

Implement modules until tests green.

## Tests After

- Golden fixture jsonl with ok/blocked/timeout rows
- Argv snapshot for resume vs fresh start

## Regression Gate

`npm test -- test/desktop-adapter.test.ts` and full `npm test`

## Test scenario matrix

| Case | Expect |
|------|--------|
| blocked loadStatus | unknown |
| ok + none | false |
| ok + affiliate | true |
| concurrency 99 | clamped to 3 |
| resume true | `--resume` present, query optional |

## Function / interface checklist

- [x] `buildScanArgv(opts: JobOptions): string[]`
- [x] `readProgress(outDir: string): ProgressSnapshot | null`
- [x] `countKetQuaFromJsonl(jsonlPath: string): KetQuaCounts`
- [x] `defaultDesktopProfileDir(env?, platform?): string`

## Dependency map

- lib/export.simpleHit, lib/types.ScanResult
- Blocks UI + Electron spawn

## Implementation Steps

1. Write failing tests in `test/desktop-adapter.test.ts`.
2. Implement argv builder (array args only — no shell concatenation).
3. Implement progress reader (JSON.parse file).
4. Implement jsonl counter (line-by-line; skip corrupt lines).
5. Implement profile path helper.
6. Run regression gate.

## Success Criteria

- [x] All new tests pass
- [x] Full suite still green
- [x] No Electron dependency introduced

## Risk Assessment

JSONL may be huge — count by streaming lines, not loading all into DOM (phase 3 will poll counts, not full table).
