---
phase: 1
title: "Foundation & contracts"
status: pending
priority: P1
effort: "2h"
dependencies: []
---

# Phase 1: Foundation & contracts

## Overview

Freeze desktop module layout and shared contracts so later phases do not invent parallel arg/progress shapes. No Electron yet — scaffolding + types + docs pointers only.

## Requirements

- Functional: `desktop/` package root with README stating CLI-reuse contract; shared types for progress + job options
- Non-functional: zero change to running Linux 10k job; no new runtime deps yet

## Architecture

`desktop/` is the only new top-level product surface. Imports `lib/export` for `simpleHit`/`SimpleHit` only — never duplicates classify rules.

## Related Code Files

- Create: `desktop/README.md`, `desktop/types.ts`
- Modify: none required (optional package.json script stub deferred to phase 4)
- Delete: none

## File inventory

| Path | Action | Notes |
|------|--------|-------|
| `desktop/README.md` | Create | Contract: spawn CLI, watch artefacts, no engine rewrite |
| `desktop/types.ts` | Create | `ProgressSnapshot`, `JobOptions`, `KetQuaCounts` |

## Test scenario matrix

| Scenario | Type | Phase |
|----------|------|-------|
| Types compile / export | unit | 1 (smoke via tsc or imported by phase-2 tests) |

## Function / interface checklist

- [x] `ProgressSnapshot` matches `cli/index.ts` writeProgress fields: query, total, completed, updatedAt, earlyExit
- [x] `JobOptions` maps to CLI flags (query, limit, out, resume, profile, concurrency, delayMs, scanProfile, acceptFailures)

## Dependency map

- Depends on: `cli/index.ts` progress shape (read-only), `lib/export.ts` SimpleHit
- Blocks: phase 2 adapter

## Implementation Steps

1. Create `desktop/` with README contract (Vietnamese customer outcome + English engine boundary).
2. Add `desktop/types.ts` mirroring progress.json + job options.
3. Confirm no imports from Electron yet.

## Success Criteria

- [x] `desktop/types.ts` and README exist
- [x] Progress field names match live `out/*/progress.json` / CLI writer
- [x] Linux scan job still running undisturbed

## Risk Assessment

Low. Over-scoping Electron here → keep phase 1 types-only.

<!-- Updated: Red Team — path containment types; job.json shape -->
