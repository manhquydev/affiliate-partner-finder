# Ship report — v1.0.11 (Track S opt-in)

**Date:** 2026-08-27  
**Tag:** `v1.0.11`  
**Prior release:** `v1.0.10` (unchanged on GitHub until this tag)

## Summary

Desktop + CLI **1.0.11** adds optional parallel path-probe (`--probe-parallel`, batch≤3, **default OFF**), profile page isolation fix, CLI profile safety guard, and xvfb goto hang-fix (`domcontentloaded`). Does **not** change ethics (`blocked≠none`, concurrency≤3, no CF bypass).

## Features shipped

| Item | Default | Notes |
|------|---------|-------|
| `--probe-parallel` (CLI) | OFF | Same 28 paths + junk; no stop-on-hit |
| `--probe-batch-size` | 3 | Clamped 1..3 |
| `--profile-timing` | OFF | JSONL `timingsMs` only |
| Desktop **Quét đường dẫn song song** | OFF | Checkbox unchecked; argv omits flag |
| Profile isolation | always on | `newPage()` per company; always `closeQuietly` |
| CLI `--profile` guard | — | Rejects Chrome User Data paths |
| `goto` waitUntil | `domcontentloaded` | Hang-fix on Xvfb; documented separately from probe-parallel |

## Measured throughput (directional, n=61)

From `plans/reports/metrics-track-s-ab.md` (post-isolation-fix paired run):

```
Control:    1098s
Treatment:   685s  (--probe-parallel only delta)
Speedup:    37.6%  (gate threshold ≥25% → PASS)
true→false: 0
cross-domain: 0/61
GATE: PASS (directional-throughput)
```

**Caveat:** n=61, none-heavy mix; not a production n=200 claim. Golden verify FAIL on CF sites — orthogonal lane.

## Test evidence (local, pre-push)

```
npm test           → 180/180 PASS
npm run test:track-s → 22/22 PASS
```

New tests: isolation locks, `toInjectableSource` path-probe inject, CLI profile guard, e2e `#probeParallel` unchecked.

## Files (high level)

- `cli/`, `lib/path-probe.ts`, `lib/probe-batch.ts`, `lib/safe-paths.ts`
- `desktop/` checkbox + argv wiring
- `docs/desktop-windows.md`, `docs/06-data-schema.md`, `README.md`
- `scripts/track-s-*.sh|mjs`, `plans/reports/metrics-track-s-ab.md`

## Not in this release

- Default ON probe-parallel
- n=200 production gate
- Golden/CF fixes (vecteezy, mohd.it)
- `npm run compile` CI gate (tsc still red, pre-existing)

## Release

Push `v1.0.11` tag → GitHub Actions `Release Desktop` builds NSIS + AppImage + deb.
