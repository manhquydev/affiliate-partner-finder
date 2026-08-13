# Test Report — Track A (network / lazy settle)

**Timestamp:** 2026-08-13  
**Role:** ak:test  
**Repo:** affiliate-partner-finder  
**Scope:** Full default Vitest suite + Track A focused files  
**Constraints:** No `--network-evidence` / `--lazy-settle` on live shards; no commit

## Commands

### 1. Full suite

```bash
npm test
```

| Metric | Result |
|--------|--------|
| Exit | 0 |
| Test files | 16 passed |
| Tests | **129 passed / 0 failed** |
| Duration | ~2.05s |

Files: export, virtual-display, path-probe, classify, early-exit, detector-config, labels, desktop-eta, network-collector, injectable, network-hosts, desktop-adapter, run-engine, lazy-settle-budget, close-quietly, detector.

### 2. Track A focused

```bash
npm test -- test/network-hosts.test.ts test/network-collector.test.ts test/lazy-settle-budget.test.ts
```

| Metric | Result |
|--------|--------|
| Exit | 0 |
| Test files | 3 passed |
| Tests | **18 passed / 0 failed** |
| Duration | ~1.02s |

## Failures

None.

## Fixes applied

None required.

## Live shards / flags

Not touched. Did not pass `--network-evidence` or `--lazy-settle` to any scan process.

## STATUS: PASS
