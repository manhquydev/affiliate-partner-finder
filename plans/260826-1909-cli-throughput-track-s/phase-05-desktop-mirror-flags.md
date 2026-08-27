---
phase: 5
title: "Desktop mirror flags"
status: pending
priority: P2
effort: "4h"
dependencies: [4]
---

# Phase 5: Desktop mirror flags

## Overview

**Hard gate:** Do not start until `grep -q 'GATE: PASS' plans/reports/metrics-track-s-ab.md`.

Mirror `--probe-parallel` as unchecked checkbox (Vietnamese label TBD).

## Related Code Files

- Modify: `desktop/renderer/app.js`, `desktop/main.ts`, `docs/desktop-windows.md`

## Success Criteria

- [ ] CI or cook script verifies PASS file before desktop edits
- [ ] Default OFF; e2e 9/9 green

<!-- Updated: Red Team RT-S-09 enforcement -->
