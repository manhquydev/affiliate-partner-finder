# CHECK — Track S rerun (independent)

**Date:** 2026-08-27  
**Tree:** `/home/manhquy/Downloads/affiliate-partner-finder` (working tree; Track S files uncommitted)  
**Prior reports:** not used as authority. Commands, `stat`, `git show HEAD`, and `out/track-s-ab-*/results.jsonl` re-run here.

**OVERALL CHECK: FAIL**

---

## Scoreboard

| # | Item | Result |
|---|------|--------|
| 1 | `npm run compile` | **FAIL** |
| 2 | `npm run test:track-s` | **PASS** |
| 3 | `scripts/track-s-ab.sh`, `finalize-track-s-ab.mjs`, `compare-track-s-ab.mjs` exist + executable | **PASS** |
| 4 | `cli/scan.ts` `remainingScanBudgetMs` bug was real | **PASS** (probe wall; settle unused on Track S) |
| 5 | `cli/browser.ts` keepAlive shared-tab bug real under `--concurrency 2` | **PASS** (confirmed in A/B JSONL) |

---

## 1. `npm run compile` — FAIL

Command: `npm run compile` → `tsc --noEmit`. Exit **2**.

**35 errors.** Classes:

| Count | Code | Where |
|------:|------|--------|
| 16 | TS5097 `.ts` import without `allowImportingTsExtensions` | `desktop/*`, `lib/config.ts:124`, `scripts/merge-shards.ts`, `test/collect-pagination.test.ts`, `test/desktop-electron.e2e.test.ts` |
| 8 | TS2339 / TS2531 / TS18048 | `test/desktop-electron.e2e.test.ts` (`affiliateDesktop`, null DOM) |
| 4 | TS2353 | `test/early-exit.test.ts` (`totalLinks` not on `EarlyExitSignal`) |
| 2 | TS2741 / TS2739 | `test/desktop-adapter.test.ts` (`Evidence`, `LinkHit`) |
| 2 | **TS7006** | **`test/track-s-compare.test.ts:11`** `row(domain, verdict, …)` implicit `any` |
| 2 | TS18047 / other | `lib/trustpilot-reader.ts:39` (`el` possibly null) |

Track S itself is in the failure set (`test/track-s-compare.test.ts`).

`tsconfig.json` **excludes `cli/`**. `cli/scan.ts` and `cli/browser.ts` are **not typechecked** by this command. Compile cannot validate the two “fixes” below.

---

## 2. `npm run test:track-s` — PASS

```
vitest run test/profile-timing.test.ts test/path-probe.test.ts
          test/track-s-cli-args.test.ts test/track-s-ab-guard.test.ts
          test/track-s-cohort.test.ts test/track-s-compare.test.ts

Test Files  6 passed (6)
     Tests  22 passed (22)
Duration    1.48s
```

This suite does **not** exercise Playwright, `--scan-profile`, or live A/B.

---

## 3. Scripts exist + executable — PASS

| Path | mode | `-x` | syntax |
|------|------|------|--------|
| `scripts/track-s-ab.sh` | `775` | yes | `bash -n` OK |
| `scripts/finalize-track-s-ab.mjs` | `775` | yes | `node --check` OK |
| `scripts/compare-track-s-ab.mjs` | `775` | yes | `node --check` OK |

`track-s-ab.sh` is a real seed+scan runner (not Track A preflight-only): `--scan-profile`, `--concurrency 2`, Linux `--virtual-display`, treatment adds only `--probe-parallel`. Guards refuse `design-full-10k` and non-`out/track-s-*`.

---

## 4. `remainingScanBudgetMs` bug confirmed — PASS

**HEAD** (`git show HEAD:cli/scan.ts`): after `goto`, remaining is a **one-shot number** and is passed only to `settleForScan`. Path-probe is:

```ts
const probeBudget = Math.min(cfg.paths.length * probeFetchTimeoutMs + probeFetchTimeoutMs, 90_000);
```

No remaining clamp. `scanOneCli` still wraps the whole `scanOnPage` in `withTimeout(..., 120_000)`.

**Working tree:** remaining is a thunk, invoked at settle **and** at probe:

```ts
const remainingScanBudgetMs = () => Math.max(0, scanBudgetMs - (Date.now() - scanStarted));
// settleForScan(..., remainingScanBudgetMs: remainingScanBudgetMs())
// probeBudget = Math.min(..., 90_000, remainingScanBudgetMs())
```

**Why this is a real bug**

If `goto` + settle + detector eat enough of the 120s wall, HEAD still grants probe up to 90s. The **outer** timer then rejects `scanOnPage` and `scanOneCli`’s `catch` returns a fresh `timeout` `baseResult` — homepage detector evidence is discarded.

Defaults: `tabTimeoutMs=20000`, settle 1200ms, probe cap 90s. The clamp is slack (~8s) unless detector/`evaluateInjectable` runs long (it has **no** inner timeout). Latent, but the contract “120s is the company wall” was not applied to probe.

**Scope note (not a FAIL):** Track S A/B does not pass `--lazy-settle`. `settleForScan` ignores `remainingScanBudgetMs` unless `lazySettle` is on. The settle-time snapshot was not itself wrong; the miss is **probe**. The thunk is the right way to recompute at probe time.

`test/lazy-settle-budget.test.ts` locks `resolveLazySettleBudgetMs` only. No test asserts probe `Math.min(..., remainingScanBudgetMs())`.

---

## 5. keepAlive shared-tab bug confirmed (concurrency 2) — PASS

**HEAD** `launchScanSession` profile mode:

```ts
openPage: async () => ({ page: await context.newPage() })
```

Blank `keepAlive` tab stayed open so closing the last **company** page did not exit Chrome. `scanOneCli` always `closeQuietly(page)`.

**Working tree** (`cli/browser.ts` 2026-08-26 21:38 +07):

```ts
openPage: async () => ({ page: keepAlive })
```

`scanOneCli` (2026-08-27 00:40 +07) skips close when `session.mode === 'profile'`.

`scripts/track-s-ab.sh` uses **`--scan-profile --concurrency 2`**. `cli/index.ts` shares **one** `ScanSession` across `pLimit(2)`. Two companies therefore `page.goto` the **same** Playwright page.

A/B ran **after** both edits:

| artifact | mtime (+07) |
|----------|-------------|
| `cli/browser.ts` reuse | 2026-08-26 21:38 |
| `cli/scan.ts` skip-close | 2026-08-27 00:40:18 |
| control `scannedAt` | 00:41:27 – 00:57:24 |
| treatment `scannedAt` | 00:57:32 – 01:12:07 |

**Empirical contamination** (`out/track-s-ab-*/results.jsonl`): `finalUrl` host is another cohort domain.

| arm | n | cross-domain landings | examples |
|-----|--:|----------------------:|----------|
| control | 61 | **16** | `designmodo.com` → `nordicnest.se` (ok/affiliate); `envato.com` → `canva.com`; `figma.com` → `dribbble.com` |
| treatment | 61 | **10** | `webswiftusa.com` → `jmsplanet.com`; `mohd.it` → `finnishdesignshop.com` |

Control `scannedAt` spacing: **12** pairs &lt;1s apart (concurrent finishes).

This is not “A redirected to B”. Unrelated brands share a tab; the second `goto` steals the first company’s page. Verdicts, golden, and `blocked→none` on this A/B are **not** attributable to `--probe-parallel`.

The comment “extra `newPage()`+load hangs under persistent Chrome + xvfb” was **not reproduced** in this check. Micro trial never used `--scan-profile`. A/B only ran with reuse already on. Isolation-correct design remains: keepAlive blank + `newPage()` per company + close the company page. If `newPage()` hangs, serialize profile mode (`concurrency=1`) or pool pages — do not share one tab at concurrency 2.

---

## Blockers (must clear before a Track S A/B rerun counts)

1. **`tsc --noEmit` red.** At minimum type `test/track-s-compare.test.ts` `row()`. Remaining 33 errors are desktop/lib/test pre-existing but still fail the named command.
2. **Do not rerun A/B with keepAlive reuse + `--concurrency 2`.** Restore per-company `newPage()` (or force profile concurrency 1). Current `out/track-s-ab-*` and `plans/reports/metrics-track-s-ab.md` (`GATE: FAIL`, 8.6% speedup, 11 blocked→none) are **invalid** as a probe-parallel gate.
3. **`cli/` excluded from `tsconfig.json`.** Compile will not catch a recurrence of (4)/(5).
4. No unit/integration test that profile `openPage` returns a **fresh** page, or that two concurrent `scanOneCli` calls cannot share a `Page`.

## Not blockers for this CHECK (recorded only)

- `metrics-track-s-ab.md` already `GATE: FAIL` on throughput/golden/FN/ethics — moot until isolation is fixed.
- `test:track-s` green does not cover live scan isolation.
- `npm run compile` does not typecheck `cli/`.
