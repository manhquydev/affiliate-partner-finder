# Cook report: Phase 03 MutationObserver lazy settle

**Date:** 2026-08-13  
**Plan:** `plans/260813-0816-network-lazy-settle-quality-track-a/phase-03-mutationobserver-settle.md`  
**STATUS:** DONE (scaffolding)

## Locks honored (M2 / redteam)

| Lock | Result |
|------|--------|
| `--lazy-settle` **default OFF** | CLI `lazySettle: false`; desktop omits flag unless `JobOptions.lazySettle` |
| Enabled settle **replaces** `waitForTimeout(1200)` | `settleForScan` — single path; never calls both |
| Budget ≤1200ms when on; A7 > A6 | `DEFAULT_LAZY_SETTLE_BUDGET_MS = 1200`; `resolveLazySettleBudgetMs` clamps |
| Hard-stop vs remaining scan budget | `min(budget, remainingScanBudgetMs)` |
| Do not touch live shards | No shard process/script changes |

## What shipped

- `cli/browser.ts`: `settleLazy`, `settleForScan`, `resolveLazySettleBudgetMs`, constants
- `cli/scan.ts`: opt-in via `ScanCliOptions.lazySettle` (default off → fixed 1200ms)
- `cli/index.ts`: `--lazy-settle` help + parse + pass-through
- `desktop/build-scan-argv.ts` + `desktop/types.ts`: stub (opt-in only)
- `README.md` CLI note
- `test/lazy-settle-budget.test.ts` + desktop argv tests

## Gaps / follow-ups

- Extension still `sleep(700)` in `lib/scan.ts` — CLI-first; parity later
- Phase-1 `networkHits` classify types not required for this settle path
- Phase-04: link-count A/B on `none@ok` sample; Playwright wall-clock soak optional
- Do **not** enable on resume of cooling 10k shards unless measuring A/B

## Tests

```text
npm test -- test/lazy-settle-budget.test.ts test/desktop-adapter.test.ts
```
