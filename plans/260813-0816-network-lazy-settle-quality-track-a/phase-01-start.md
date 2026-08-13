---
title: "Phase 1: Contracts & classify merge"
status: done
priority: P1
effort: "3-5h"
dependencies: []
---

# Phase 1: Contracts & classify merge

## Overview

Extend shared types and `classify` so network-derived platform hosts become first-class evidence without breaking extension inject contracts.

## Requirements

- [x] Add typed field for network platform hits (e.g. `networkHits: string[]` on evidence / classify input)
- [x] Classify treats nonempty network platform hits like strong platform evidence (`affiliate`/`high` when policy matches existing platformHits)
- [x] Preserve `evidenceUrl` / method provenance (`network`)
- [x] Bump or document `detectorVersion` when network evidence present
- [x] Pure unit tests for classify merge (no Playwright required)

## Related Code Files

- Modify: `lib/types.ts`, `lib/classify.ts`, `lib/export.ts` (if method column needs `network`)
- Modify: `test/*classify*` / `test/desktop-adapter` only if needed
- Create: small helper `lib/network-hosts.ts` (host match pure functions) — preferred over duplicating inject detector

## Implementation Steps

1. Extract or share host-boundary matcher usable from Node (not only inject serialization).
2. Extend types + classify rules + export method mapping.
3. Unit tests: network hit alone → affiliate; known-none fixture unchanged.

## Todo

- [x] Types + classify
- [x] Export method=`network`
- [x] Unit tests

## Success Criteria

- [x] Vitest covers network→verdict paths
- [x] No change to `loadStatus!=='ok'` → unknown policy
- [x] Host-boundary matcher unit tests cover substring FP cases (e.g. drawing.com vs awin) **before** phase-2 enables network→classify
