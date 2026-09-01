---
title: "Cook code review — collect-list lite"
date: 2026-09-01
verdict: PASS
status: DONE
---

# Cook code review — collect-list lite

**Verdict: PASS**
**Status: DONE**

Reviewed against `plan.md`, `phase-02-cli-collect-only.md`, `phase-03-desktop-lay-danh-sach.md`, and the listed implementation files. No full lint/build/suite. Report-only; no source edits.

## Contract

| # | Check | Status | Evidence |
|---|--------|--------|----------|
| (a) | `--collect-only` never `launchScanSession`; `afterCollectAction` before scan pending | PASS | `afterCollectAction` is called after collect `try/finally` closes the browser (`cli/index.ts:339-346`) and **returns** on `kind==='exit'` (`:347-352`) before `pending=` / `launchScanSession` (`:361-369`). `collectOnly: true` always exits: count≤0 → 130/1, count>0 → 130/0 (`lib/after-collect.ts:10-16`). Never `{ kind: 'scan' }`. |
| (b) | CSV `stt,ten_website,link` via `csvCell`; no HYPERLINK | PASS | `COMPANIES_CSV_COLUMNS` + every cell through `csvCell` (`lib/export.ts:82-88,175-187`). `link` = `domainToUrl` (`lib/resolve.ts:16-18`). No `HYPERLINK` under `lib/`, `cli/`, `desktop/`. |
| (c) | Desktop **Lấy danh sách** + IPC whitelist `collectOnly` | PASS | Button label exact, after **Bắt đầu**, before **Tiếp tục** (`desktop/renderer/index.html:178-186`). `startFreshJob({ collectOnly: true })` (`app.js:585-586`). IPC type + `collectOnly: Boolean(opts.collectOnly)` (`desktop/main.ts:238,257`). `JobOptions.collectOnly` (`desktop/types.ts:30`). Argv `--collect-only` when `collectOnly && !resume` (`desktop/build-scan-argv.ts:53-55`). Locks: `app.js:409-410,543-544,550-551`. |
| (d) | `onExit` does not synth empty `results.csv` | PASS | Synth only if jsonl **exists and size > 0** (`desktop/job-supervisor.ts:301-319`). Lite has no jsonl → skip. `csvPath` = `resolveJobCsv` (`:349`). Lite success message `Đã lấy danh sách.` (`:352-353`). |
| (e) | Open CSV path escape `isPathInside` | PASS | `resolveJobCsv` then `resolveExistingPath` then `isPathInside(runsRoot, real)` (`desktop/main.ts:295-302`). Missing file: `Chưa có CSV — chạy Lấy danh sách hoặc quét xong.` (`:299`). |
| (f) | Full **Bắt đầu** / `toSimpleCSV` unchanged | PASS | Start: `startFreshJob({})` → no `collectOnly` (`app.js:585`). IPC `Boolean(undefined)` = false. Argv omits flag unless `collectOnly`. `toSimpleCSV` still `ten_cong_ty,website,ket_qua,huong_dan` (`lib/export.ts:159-173`). |
| (g) | **Tiếp tục** omits `--collect-only` | PASS | Resume payload is `{ out, resume: true, ...scanOptFlags() }` — no `collectOnly` (`app.js:588-593`). Belt: `buildScanArgv` drops flag when `opts.resume` even if `collectOnly: true` (`desktop/build-scan-argv.ts:53-55`). CLI rejects `--resume --collect-only` exit 2 (`cli/index.ts:207-209`). |
| (h) | Idle copy after lite success | PASS | `phase==='collect'` + running → collecting hint; + idle + `message === 'Đã lấy danh sách.'` → `Đã lấy danh sách. Mở CSV hoặc Tiếp tục để quét website.`; else stopped copy (`desktop/renderer/app.js:341-350`). Supervisor sets that message only on collect-only clean exit (`job-supervisor.ts:352-353`). |

## Findings

None that violate plan acceptance.

### Residual (not blocking)

| Severity | Item | Notes |
|----------|------|-------|
| Low | Idle success copy is in-memory | Hint keys off `s.message === 'Đã lấy danh sách.'` **and** `pathMatch` (`app.js:347-350`), not `companies.csv` as red-team suggested. Same-session success is correct. After process restart, `phase==='collect'` + idle with no message still shows the stopped line. Out of the original in-session High finding; not a 1–2 line contract miss. |

## Spec extras (justified)

- `afterCollectAction` also exits the **Full** collect path when `count<=0` (`cli/index.ts:342-352`). Same 130/1 codes as the old fall-through; Full with `count>0` still `{ kind: 'scan' }` including stop+partial (`lib/after-collect.ts:16-17`, `test/after-collect.test.ts`).
- Checkpoint `companies.csv` on collect `onProgress` only when `collectOnly` (`cli/index.ts:291`). Atomic temp+rename (`:151-155`). Zero companies: no write (`:152`, `:348`).

## Verification (scoped, not full suite)

```
npx vitest run test/export.test.ts test/after-collect.test.ts test/job-csv.test.ts
npx vitest run test/after-collect.test.ts test/job-csv.test.ts test/cli-collect-only-help.test.ts \
  test/export.test.ts test/desktop-adapter.test.ts \
  -t "collect-only|collectOnly|toCompaniesCSV|toSimpleCSV|resolveJobCsv|afterCollectAction|skips results.csv"
```

- `test/export.test.ts` 16 passed (header, csvCell injection, no HYPERLINK, `toSimpleCSV` 4 columns)
- `test/after-collect.test.ts` 5 passed (0+stop→130, 0→1, lite+stop→130, lite→0, full+stop+n→scan)
- `test/job-csv.test.ts` 4 passed (neither / companies / results / results wins)
- `test/cli-collect-only-help.test.ts` 1 passed
- `test/desktop-adapter.test.ts` filtered: argv collectOnly, resume omits flag, onExit skips `results.csv` + `Đã lấy danh sách.`

Did not run e2e / project-wide lint / full suite (assignment).

## Verdict

**PASS** — all eight cook-contract checks hold with file:line evidence. No FIX.
