---
phase: 1
title: "Desktop 1.0.10 ship"
status: in-progress
priority: P1
effort: "4-8h"
dependencies: []
---

# Phase 1: Desktop 1.0.10 ship

<!-- Updated: Red Team RT-2, RT-3, RT-7, RT-8, RT-9 -->

## Overview

Land desktop delta: IPC opens CSV/folder for **selected** job; browse while scan runs; fix Start/idle selection races; add IPC e2e; bump **1.0.10**; **Win smoke before tag**; CI produces NSIS.

## Success Criteria

- [x] Merged on main; version 1.0.10 (`00abf03`)
- [x] `desktop/main.ts:273` `requestedOutDir` wired; renderer passes explicit out to IPC
- [x] E2E: row selection + Job mới + IPC openCsv/openOutDir
- [x] Idle browse: `#out` preserved after Stop when user viewed another job
- [ ] Win smoke report signed **PASS** (`test-260826-win-smoke-110.md`)
- [ ] CI release artefact valid — tag `v1.0.10` not pushed yet

## Test gate

`npm test` → `npm run test:desktop:e2e` → **manual Win smoke** → `scripts/release-v1.0.10-gate.sh` → push tag
