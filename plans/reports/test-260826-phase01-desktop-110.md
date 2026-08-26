---
type: tester
date: 2026-08-26
scope: phase-01 desktop 1.0.10
plan: plans/260826-0909-next-deployment-scope/phase-01-desktop-110-ship.md
---

# Test Report — Phase 01 Desktop 1.0.10

## Results

| Lane | Total | Passed | Failed | Skipped |
|------|------:|-------:|-------:|--------:|
| Unit `npm test` | 152 | 152 | 0 | 0 |
| E2E `npm run test:desktop:e2e` | 11 | 10 | 0 | 1 |

Skip: packaged linux smoke (no dist-desktop/linux-unpacked).

## New coverage

- Idle preserves browsed `#out` after Stop (away from live job)
- IPC `openCsv` / `openOutDir` with explicit selected path (shell.openPath stubbed in e2e)
- Start re-reads `#out` immediately before `startJob`

## Gates not run (manual)

- Win VM smoke checklist — required before tag `v1.0.10`
- CI NSIS release artefact

## Verdict

**PASS** for automated gates. **HOLD tag** until Win smoke report exists.
