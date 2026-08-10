---
title: "Phase 4: CLI orchestrator checkpoint CSV"
status: todo
phase: 4
effort: "1d"
dependencies: [3]
---

<!-- Updated: Red Team Review 2026-08-10 -->

# Phase 4: CLI orchestrator checkpoint CSV

## Overview

End-to-end CLI: args → collect → **snapshot `companies.json`** → resolve → concurrent scan (≤3) → **single-writer JSONL** + progress → CSV/JSON. Resume loads company snapshot + skips domains with terminal JSONL rows (**no silent re-collect**). ScanResult-shaped errors only; start-stagger delay; export last-wins Map; browser disconnect ⇒ non-zero; maxRetries.

## Requirements

- [x] Args: `--query`, `--limit`, `--concurrency` (default 2, max 3), `--delay-ms`, `--out`, `--resume`, `--profile`, help
- [x] After successful collect: write `<out>/companies.json` snapshot (cohort frozen)
- [x] Checkpoint: single-writer queue → `<out>/results.jsonl` (append + fsync); skip corrupt lines on load
- [x] `<out>/progress.json` derived from JSONL (+ metadata); atomic write
- [x] Resume: load `companies.json`; skip domains with terminal results in JSONL; **do not re-collect**
- [x] Errors: always `ScanResult`-shaped (`baseResult` style) — never ad-hoc error objects that break `toCSV`
- [x] Start-stagger delay between concurrent scan starts; maxRetries on scan
- [x] Export: last-wins `Map<domain, ScanResult>` then `toCSV` / `toJSON`
- [x] Browser disconnect / fatal launch failure ⇒ process exit ≠0

## Architecture

### CLI args

| Flag | Default | Notes |
|------|---------|-------|
| `--query` | required (fresh) | Trustpilot search |
| `--limit` | 20 | max new companies |
| `--concurrency` | 2 | clamp 1..3 |
| `--delay-ms` | ≥1000 (suggest 1500) | start-stagger / throttle |
| `--out` | `./out/run` or timestamp | job dir |
| `--resume` | path | reuse out dir + companies snapshot |
| `--profile` | `~/.cache/affiliate-partner-finder/chrome-profile` | Trustpilot |

### Checkpoint

- **companies.json** — full `Company[]` after collect (resume source of truth for cohort)
- **results.jsonl** — one finished `ScanResult` per line; single writer serializes all appends
- **progress.json** — completed/total/phase/updatedAt from JSONL counts + run meta

### Resume algorithm

1. If `--resume`: require `companies.json`; load JSONL → map domains with terminal results (skip bad lines).
2. Do **not** call collect again; scan remaining companies from snapshot only.
3. Fresh run: collect → write companies.json → scan → append JSONL.

### Concurrency

```
const limit = pLimit(concurrency) // max 3
// stagger starts by delayMs
await Promise.all(companies.map((c, i) => limit(async () => {
  await sleep(i * staggerOrDelay)
  return scanWithRetries(c) // maxRetries
})))
```

### Data flow

```
argv → outDir
  → resume? load companies.json + jsonl skips
  → else collectCli → write companies.json
  → resolve + p-limit scan → single-writer append jsonl → progress
  → Map last-wins → toCSV/toJSON
```

## Related Code Files

- Modify: `cli/index.ts`
- Optional: `cli/checkpoint.ts`, `cli/args.ts`
- Use: browser/collect/scan adapters; `lib/resolve.ts`, `lib/export.ts`
- Do not use `lib/storage.ts`

## Implementation Steps

1. Parse argv; clamp concurrency ≤3.
2. Ensure out dir; single-writer JSONL append + fsync; progress from JSONL.
3. Fresh: collect (headed persistent) → write `companies.json`; close collect context.
4. Resume: load snapshot; skip done domains; no collect.
5. Resolve; on fail write ScanResult-shaped error row.
6. Scan browser + p-limit + start-stagger + maxRetries; disconnect ⇒ exit ≠0.
7. Export last-wins map → CSV/JSON.
8. Console `completed/total domain verdict`.

## Todo

- [x] Arg parse + concurrency clamp
- [x] companies.json snapshot after collect
- [x] Single-writer JSONL + progress from JSONL
- [x] Resume without re-collect
- [x] ScanResult-shaped errors only
- [x] Start-stagger + maxRetries
- [x] Export last-wins Map
- [x] Disconnect ⇒ non-zero
- [x] Manual E2E `--limit 5` + kill/resume

## Success Criteria

- [x] `npm run scan -- --query … --limit 5 --out ./out/smoke` → csv+json+jsonl+companies.json
- [x] Kill mid-run → resume uses companies.json; no re-collect; no re-scan finished domains
- [x] CSV columns match export header; no broken error rows
- [x] Concurrent ≤3; default 2
- [x] Browser death / CF collect fail ⇒ exit ≠0

## Risk Assessment

| Risk | L×I | Mitigation |
|------|-----|------------|
| Concurrent JSONL corruption | H | Single-writer queue + fsync (RT-5) |
| Resume re-collects | H | companies.json + skip collect (RT-4) |
| Error lines break toCSV | H | ScanResult-shaped only (RT-6) |
| Export duplicates | M | last-wins Map (RT-14) |
| Disconnect silent success | M | non-zero exit (RT-15) |

## Rollback

Keep adapters; revert orchestrator to help-only; delete checkpoint helpers.

## Test plan

- [x] `npm test`
- [x] E2E limit 5
- [x] Kill mid-scan → resume; assert no second collect
- [x] Inspect CSV: no blocked→none; error rows shape-valid

## Validation Log

> `--auto` validation adopts the Decisions section in `plan.md` (and Red Team Review Accept table). Confirm companies snapshot, single-writer JSONL, and resume-no-recollect before cook.
