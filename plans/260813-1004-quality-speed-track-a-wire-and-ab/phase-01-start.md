---
phase: 1
title: "Wire verify finish"
status: pending
priority: P1
effort: "2h"
dependencies: []
---

# Phase 1: Wire verify finish

## Overview

Confirm local Track A desktop/CLI wire is complete, fix any gaps, keep tests green. Code largely exists from ops-0918 — this phase is verify + finish, not greenfield.

## Requirements

- Functional: UI checkboxes for earlyExit / networkEvidence / lazySettle (default unchecked)
- Functional: `desktop/main.ts` passes flags into `JobSupervisor` / `buildScanArgv`
- Functional: `shouldSkipPathProbe` honors `networkHits`; `cli/scan.ts` snapshots hits before probe
- Functional: ETA refuses near-zero rates (`MIN_USABLE_RATE_PER_HOUR`)
- Non-functional: default OFF; no change to shard-relaunch argv

## Related Code Files

- Modify (if needed): `desktop/main.ts`, `desktop/renderer/*`, `desktop/eta.ts`, `lib/early-exit.ts`, `cli/scan.ts`
- Test: `test/desktop-adapter.test.ts`, `test/early-exit.test.ts`, `test/desktop-eta.test.ts`

## Implementation Steps

1. Diff against plan requirements; close any missing wire.
2. Run focused tests; fix failures.
3. Confirm `scripts/shard-relaunch.mjs` still omits Track A flags.

## Todo

- [x] Gap check desktop IPC/UI
- [x] Gap check early-exit×network
- [x] Gap check ETA floor
- [x] Focused tests green

## Success Criteria

- [x] All focused tests pass
- [x] No Track A flags in `shard-relaunch.mjs` launch args
