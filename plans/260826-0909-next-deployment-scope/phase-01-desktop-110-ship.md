---
phase: 1
title: "Desktop 1.0.10 ship"
status: pending
priority: P1
effort: "4-8h"
dependencies: []
---

# Phase 1: Desktop 1.0.10 ship

<!-- Updated: Red Team RT-2, RT-3, RT-7, RT-8, RT-9 -->

## Overview

Land desktop delta: IPC opens CSV/folder for **selected** job; browse while scan runs; fix Start/idle selection races; add IPC e2e; bump **1.0.10**; **Win smoke before tag**; CI produces NSIS.

## Requirements

- Functional: `requestedOutDir(outPath?)` for open handlers; renderer passes `$('out').value`; job table selectable during scan; `liveJobNote` when preview ≠ live job.
- Functional: Re-read `$('out')` immediately before `startJob`/`resumeJob` (not frozen pre-sync snapshot).
- Functional: On idle status, **do not** call `setOutPath(s.outDir)` if user had browsed to another job during live scan.
- Non-functional: Merge to main required; 152 unit + 10+ e2e (incl. IPC); CI tag for Win pack (no local wine on Linux dev).

## Related Code Files

- Modify: `desktop/main.ts`, `desktop/preload.cjs`, `desktop/renderer/{index.html,app.js,styles.css}`
- Modify: `test/desktop-electron.e2e.test.ts`
- Modify: `package.json`, `README.md`, `docs/desktop-windows.md`, `desktop/README.md`

## Implementation Steps

1. **Code fixes (if not already in diff):**
   - `app.js` Start/Resume: use `$('out').value.trim()` after `await syncFromOutDir()`, not pre-await snapshot.
   - `app.js` idle handler: `refreshRunPicker` without forcing `setOutPath(s.outDir)` when `#out !== s.outDir` and live job was running.
   - Lock job table clicks during `syncFromOutDir` in Start/Resume path (optional if re-read suffices).
2. **E2E:** Add test invoking `openCsv`/`openOutDir` with selected `#out` (mock or inject status for live≠selected).
3. Run `npm test` + `npm run test:desktop:e2e`.
4. Commit on feature branch; bump `package.json` → `1.0.10`; update release notes.
5. **Win VM smoke checklist** (manual): Start → Stop → Resume → Mở CSV on **selected** job — record in `plans/reports/test-260826-win-smoke-110.md`.
6. **After smoke PASS:** `git tag v1.0.10 && git push origin v1.0.10` → verify CI release uploads NSIS (>50MB).

## Success Criteria

- [ ] Merged on main; version 1.0.10
- [ ] `desktop/main.ts:273` `requestedOutDir` wired; renderer passes explicit out to IPC
- [ ] E2E: row selection + Job mới + IPC openCsv path (new)
- [ ] Idle browse: `#out` preserved after Stop when user viewed another job
- [ ] Win smoke report exists **before** tag
- [ ] CI release artefact valid (not 190KB stub)

## Risk Assessment

| Risk | Response |
|------|----------|
| wine ENOENT local pack | CI-only; do not ship from partial local NSIS |
| Symlink escape (RT-6) | Pre-existing; defer hardening post-1.0.10 unless trivial |
| Boot stamp row | Document; waive for 1.0.10 |

## Test gate

`npm test` → `npm run test:desktop:e2e` → manual smoke → tag
