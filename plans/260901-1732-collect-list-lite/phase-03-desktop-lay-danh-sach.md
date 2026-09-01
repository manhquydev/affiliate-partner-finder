---
title: "Phase 3: Desktop Lấy danh sách"
status: todo
priority: P1
effort: 2h
dependencies: [2]
---

# Phase 3: Desktop Lấy danh sách

## Context Links

- Plan: [plan.md](./plan.md)
- `desktop/renderer/index.html` `#btnStart` **Bắt đầu**
- `desktop/renderer/app.js` Start/Resume/openCsv
- `desktop/build-scan-argv.ts` `JobOptions` → argv
- `desktop/main.ts` `desktop:open-csv` hardcodes `results.csv`; `desktop:start` **whitelists** fields and does not spread opts — `collectOnly` must be added to the IPC type and `supervisor.start({…})` or the button is a no-op
- `desktop/job-supervisor.ts` `onExit` writes `results.csv` from jsonl when missing — **lite trap**
- `desktop/progress.ts` `canStartFresh` blocks Start if `companies.json` exists
- `test/desktop-adapter.test.ts`, `test/desktop-electron.e2e.test.ts`

## Overview

Add button **Lấy danh sách** next to **Bắt đầu**. It starts a fresh job with `collectOnly: true`. Full Start unchanged. Open CSV and supervisor status must prefer `companies.csv` when `results.csv` is absent. Fix `onExit` so a successful lite job does not synthesize empty `results.csv`.

## Requirements

- Functional: `#btnCollectList` label exactly `Lấy danh sách` (Vietnamese, same preview-actions group)
- Same query/limit/out/profile/virtual-display as Start; `resume: false`; `collectOnly: true`
- Empty query: same error as Start (`Nhập từ khoá Trustpilot trước khi bắt đầu.`)
- Folder with `companies.json`: same `canStartFresh` refusal as Start
- **Tiếp tục** never sends `--collect-only` (Full scan on snapshot)
- **Mở CSV**: `resolveJobCsv` then `resolveExistingPath` + `isPathInside(runsRoot)` before `shell.openPath`. Error if neither file: `Chưa có CSV — chạy Lấy danh sách hoặc quét xong.`
- Supervisor: skip `writeSimpleCsvFromJsonl` when jsonl missing **or size 0**. Lite exit 0 → idle, `csvPath` = companies.csv, message `Đã lấy danh sách.`
- Idle UI: `phase==='collect'` + not running must **not** use “Đã dừng lúc lấy danh sách…” (`app.js:341-347`) after a successful lite. Use: `Đã lấy danh sách. Mở CSV hoặc Tiếp tục để quét website.`
- Lock: `#btnCollectList` in `btnStart.disabled = running`, `lockLaunchControls`, `unlockLaunchControlsIfIdle` (`app.js:405-407,534-542`)

## Architecture

```
[Lấy danh sách] → startJob({ collectOnly: true, resume: false, query, limit, … })
buildScanArgv → … --collect-only  (omit on resume)
CLI collect-only → companies.csv
onExit: skip writeSimpleCsvFromJsonl when jsonl missing or size 0; csvPath = resolveJobCsv
openCsv: results.csv || companies.csv
[Tiếp tục] → --resume  (scan)
```

Shared helper (desktop, testable): `resolveJobCsv(outDir): string | undefined` — results.csv wins.

Do not add an in-app results table.

## Related Code Files

- Modify: `desktop/types.ts` — `JobOptions.collectOnly?: boolean`; `JobStatus.csvPath` already exists
- Modify: `desktop/build-scan-argv.ts` — pass `--collect-only` when `opts.collectOnly && !opts.resume`
- Modify: `desktop/renderer/index.html` + `app.js` — button, lock, click handler
- Modify: `desktop/main.ts` — add `collectOnly?: boolean` to `desktop:start` opts; pass `collectOnly: Boolean(opts.collectOnly)` into `supervisor.start`; open-csv uses `resolveJobCsv`
- Modify: `desktop/job-supervisor.ts` — `refresh` + `onExit` csvPath / skip fake results.csv
- Modify: `test/desktop-adapter.test.ts` — argv collectOnly; resume omits flag
- Modify: `test/windows-parity.test.ts` if argv snapshots would break
- Modify: `test/desktop-electron.e2e.test.ts` — button visible; empty query on collect-list
- Create if needed: `desktop/job-csv.ts` with `resolveJobCsv` + unit test (keep tiny; OK to colocate in supervisor if no new file wanted — prefer one small helper to avoid duplicating join/exists in main+supervisor)

## Implementation Steps

1. `resolveJobCsv(outDir)` + tests: neither → undefined; only companies → that path; both → results.csv.
2. `buildScanArgv` collectOnly flag; resume never includes it even if collectOnly true.
3. Button after **Bắt đầu**, before **Tiếp tục**. Title: chỉ danh sách Trustpilot, không quét website. Include in lock/disable helpers.
4. Wire `api.startJob({ collectOnly: true, … })` via `desktop:start` whitelist + `supervisor.start`.
5. `onExit`: `hasResults` already size>0; **do not** synth CSV when `!hasResults`. `csvPath` from `resolveJobCsv`. Message lite complete: `Đã lấy danh sách.`
6. `openCsv`: resolveJobCsv + realpath + isPathInside.
7. Renderer idle collect hint as above; `refresh()` csvPath uses resolveJobCsv.
8. E2E: `#btnCollectList` text; empty query error; Start still present; collect-list disabled when running (if e2e covers Start disable).

## Todo

- [ ] resolveJobCsv + supervisor onExit fix
- [ ] Button + argv
- [ ] Open CSV routing
- [ ] Adapter + e2e tests

## Success Criteria

- [ ] **Bắt đầu** argv has no `--collect-only`
- [ ] **Lấy danh sách** argv has `--collect-only` and `--query`
- [ ] Lite complete: idle, message lấy danh sách, Mở CSV opens companies.csv, **no** `results.csv`
- [ ] Idle collect hint is not “Đã dừng lúc lấy danh sách” after success
- [ ] Existing e2e Start empty-query still passes

## Risk Assessment

| Risk | Signal | Response |
|------|--------|----------|
| Lite success writes empty results.csv | onExit `!csvOk && !failed` | skip synth when no jsonl results |
| Open CSV still demands results.csv | main.ts throw string | resolveJobCsv |
| User clicks Lấy danh sách on scanned job | canStartFresh false | existing Start error path |
| Two primary buttons confuse | copy | preview-sub / title: “chỉ danh sách Trustpilot, không quét website” |

## Security Considerations

Path still must stay inside `runsRoot` (`isPathInside`) for companies.csv. No new IPC privilege.
