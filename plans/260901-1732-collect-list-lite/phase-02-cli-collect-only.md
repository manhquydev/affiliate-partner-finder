---
title: "Phase 2: CLI --collect-only"
status: todo
priority: P1
effort: 2h
dependencies: [1]
---

# Phase 2: CLI --collect-only

## Context Links

- Plan: [plan.md](./plan.md)
- `cli/index.ts` collect block then `launchScanSession`
- `cli/index.ts` `parseArgs` / `printHelp` — no `--collect-only` today
- Collect already checkpoints `companies.json`

## Overview

Add `--collect-only`. After successful (or partial stopped) Collect, write `companies.csv` via `toCompaniesCSV` and **return before** `launchScanSession`. Full path without the flag unchanged.

## Requirements

- Functional: `--collect-only` in help; parse boolean default false
- After collect with `companies.length > 0` **and collectOnly**: write `companies.csv`, then **exit before** `cli/index.ts:333` (`pending` / `launchScanSession`). Full without the flag still scans even if Stop interrupted collect with a partial list (today’s behavior at `:318-345`).
- Collect-only + stop + partial list: write CSV, exit **130**
- Collect-only + complete + count>0: write CSV, exit **0**
- Zero companies: do **not** write `companies.csv`; exit 130 if stop else 1
- `--resume --collect-only`: stderr + exit 2
- Non-functional: still use persistent collect profile, delay, max-pages, virtual-display, CF 90s retry — collect path untouched

## Architecture

```
afterCollectAction({ collectOnly, stopRequested, count }):
  count<=0 → exit 130 if stop else 1
  collectOnly → write companies.csv; exit 130 if stop else 0
  else → scan (existing)
```

Extract chrome-free `afterCollectAction` (new `lib/after-collect.ts` or beside `lib/collect-pagination.ts`) and unit-test it. **Do not** treat `--help` as proof scan is skipped (`parseArgs` is unexported at `cli/index.ts:79`).

Call it **after** the collect `try/finally` closes the browser (`cli/index.ts:323-326`) and **before** `scan pending=` (`:337-345`).

Write CSV with the same atomic temp+rename pattern as `atomicWriteJson` (`cli/index.ts:140-144`). Skip write if count===0.

Checkpoint CSV on `onProgress` only when `collectOnly`.

## Related Code Files

- Modify: `cli/index.ts` — Args, parseArgs, printHelp, branch on `afterCollectAction`
- Create: `lib/after-collect.ts` (or equivalent) + `test/after-collect.test.ts`
- Create: optional help assertion `--collect-only` exists (insufficient alone)
- Modify: none of `cli/scan.ts`, `lib/detector.ts`, `lib/classify.ts`

## Implementation Steps

1. Add `collectOnly` flag + help.
2. Reject `--resume --collect-only` (exit 2) before collect.
3. Implement `afterCollectAction` + tests: (0,stop)→130; (0,!stop)→1; (n,collectOnly,stop)→130; (n,collectOnly)→0; (n,!collectOnly)→scan.
4. `writeCompaniesCsv` atomic; count===0 no file.
5. Wire: if action.kind==='exit' write csv when count>0, return action.code; else existing scan.
6. Help string may mention the flag; skip-scan coverage is `afterCollectAction` tests.

## Todo

- [ ] Flag + help
- [ ] Skip scan + write companies.csv
- [ ] Resume combo rejected
- [ ] Help/unit test

## Success Criteria

- [ ] `afterCollectAction` unit tests cover stop+partial lite ≠ scan
- [ ] Full `npm run scan -- --query x --limit n --out dir` still Collect+Scan
- [ ] `--collect-only` never logs `[cli] scan pending=` and never calls `launchScanSession`

## Risk Assessment

| Risk | Signal | Response |
|------|--------|----------|
| Stop during collect then lite still launches scan | code after collect has no `if (collectOnly) return` | early return immediately after CSV write |
| Header-only CSV on CF fail | companies.length===0 | do not write file |
| Resume+lite re-collects | combo allowed | exit 2 |

## Security Considerations

Same Collect ethics. No new network. CSV still `csvCell`.
