# Plan Red-team: Track A — network lazy settle quality

**Timestamp:** 2026-08-13 08:26 +07  
**Role:** PLAN RED-TEAM (report-only — no product code; no plan markdown edits this pass)  
**Plan:** `plans/260813-0816-network-lazy-settle-quality-track-a/`  
**Inputs:** `plan.md` + `phase-01`…`phase-05`; `plans/reports/plan-validate-260813-0817-track-a.md`  
**Also:** brainstorm-0816; redteam/validate R2; live hooks in `cli/` + `lib/`

## Verdict (one line)

Phases 1→2∥3→4 are cookable against verified hooks, but **three MUST-FIX locks** (anti-`unknown%` ship gate, settle default/replace/A7>A6, matcher-before-always-on) are still soft/ambiguous in plan text — fix those in plan md before cook.

## Codebase anchors (evidence filter)

| Claim | Evidence |
|-------|----------|
| Settle today = fixed timeout | `cli/scan.ts:90` `settle(page, 1200)`; `cli/browser.ts:162-163` `waitForTimeout` |
| Scan wall budget | `cli/scan.ts:21` `DEFAULT_SCAN_BUDGET_MS = 120_000` |
| No network listeners yet | no `page.on('request'|'response')` on CLI scan path (validate + grep) |
| Classify: non-ok → unknown | `lib/classify.ts:17-20` |
| Classify: platformHits → affiliate/high | `lib/classify.ts:23-27` |
| Export method lacks `network` | `lib/export.ts:10` `'link' \| 'platform' \| 'path' \| ''` |
| Host-boundary matcher | `lib/detector.ts:65-74` `isPlatformHost`; platforms `lib/config.ts:47-71` |
| `--lazy-settle` not shipped | CLI flags have no lazy-settle (phase-3 gap) |

## Attack surfaces

### 1. `unknown%` KPI leak

| Attack | Finding | Severity |
|--------|---------|----------|
| Ship notes claim “quality↑ / unknown↓” after Track A | Plan non-goal + phase-04 DoD correctly forbid unknown% as Track A success (`phase-04` Success Criteria: “**Never** unknown% (Track B)”). But `plan.md` Success Criteria has **no checkbox** forbidding unknown%↓ in PR/ship copy; Baseline table **leads** with unknown=1145 (31.3%) before Track A KPIs — ship authors copy the first table. Validate only put anti-claim in a non-binding pre-cook note. | **MUST-FIX** |
| Whole-slug DONE when 1–4 ship, unknown% flat | Looks like Track A failure. Phase 5 / A-vs-B done language missing from Success Criteria. | NICE |
| Live n drift 3659→3662 | Validate: still `unknown×ok=0`. Freeze valid. | NICE |

**Lock:** Success Criteria + phase-4 metrics header: Track A ship gate = (A1∨A2∨A3)+A4+A5+A6+A7 only; raw unknown% Δ≈0 **expected**; any unknown% claim = Track B.

### 2. Settle ETA (10k cooling rate)

| Attack | Finding | Severity |
|--------|---------|----------|
| Budget stacks on 1200ms | Phase-03 allows ≤1500–2000ms **total** settle vs today’s fixed **1200ms** (`cli/scan.ts:90`). Text never says budget **replaces** vs **stacks** on `waitForTimeout(1200)`. Stacking → easy A7 (−10% throughput) fail on resume. | **MUST-FIX** |
| Default ON vs OFF unresolved | Phase-03: “default off **or** on with same ~1200ms.” Wrong pick regresses live ETA when user relaunches shards. | **MUST-FIX** |
| A6 vs A7 conflict | A6 allows +≤1.5s mean; A7 caps −10% rate. +1.5s/page on short pages can fail A7 while “passing” A6. No priority rule. | **MUST-FIX** |
| Network observe always-on | Near-zero ETA if no `page.route` — OK with phase-02 observe-only. | OK |
| Hard-stop vs scan budget | Phase-03 cites `DEFAULT_SCAN_BUDGET_MS` — keep. | OK |

**Lock (phase-03 + plan Risks):**

1. **`--lazy-settle` default OFF** (opt-in for A/B measurement).  
2. When enabled: settle wall = **single** budget that **replaces** fixed 1200ms (not additive); hard-stop ≤ `min(budgetMs, remainingScanBudget)`.  
3. If A6 and A7 conflict on a sample → **disable settle / keep OFF** — **A7 wins**.

### 3. FP hosts (false `affiliate` via network)

| Attack | Finding | Severity |
|--------|---------|----------|
| Always-on network→classify before matcher golden | Phase-02 prefers always-on observe→classify. `classify` treats platform-strength evidence as affiliate/high (`lib/classify.ts:23-27`). CDN alias / substring mistakes mint false affiliates on every resume **before** phase-04 golden. Matcher edge cases (`drawing.com` vs `awin`) listed in phase-04, **after** phase-02 wire. | **MUST-FIX** (sequencing) |
| Unbounded CDN alias creativity | Phase-02 “CDN alias table (minimal)” — no allowlist policy (exact registrable / suffix-only). R2 gap #2 in-scope but unbounded. | **MUST-FIX** (policy) |
| `loadStatus!=='ok'`→unknown preserved | Stops fail-page FP only; does **not** stop ok-page FP. | Attack real |
| Phase-01 already plans matcher helper + known-none unit | Can gate phase-02 if plan text requires matcher tests green first. | Mitigable |

**Lock:**

1. Phase-1 host-matcher unit tests (substring / suffix / known-none) **green before** phase-2 merges networkHits into classify on the default path.  
2. Until tests + golden known-none pass: network classify behind flag **or** collect-only (log hits, no verdict flip). Prefer: matcher tests in phase 1; always-on classify only after A4 path covered.  
3. CDN aliases = explicit allowlist of host suffixes only; no bare keyword contains.

### 4. Extension gap

| Attack | Finding | Severity |
|--------|---------|----------|
| “Network evidence shipped” while extension/desktop inject unchanged | Plan non-goal; phase-02 “no chrome.webRequest parity”; phase-03 “extension may keep sleep” — intentional CLI-first. Real product uniformity gap, not Outcome Contract failure. | NICE |
| Phase-01 “don’t break extension inject contracts” | Soft; no named contract test. | NICE |
| Desktop vs CLI path | Out of plan; ship notes must say CLI-only. | NICE |

**Mitigation (non-blocking):** One Success Criteria / README sentence: Track A = CLI scan path only; extension/desktop parity = separate plan.

## MUST-FIX before cook (block start until plan text updated)

| # | Lock | Where |
|---|------|--------|
| **M1** | Forbid unknown%↓ as Track A PR/ship claim; A-vs-B done language | `plan.md` Success Criteria (+ phase-04 header echo) |
| **M2** | `--lazy-settle` **default OFF**; enabled settle **replaces** 1200ms; **A7 > A6** on conflict | `phase-03` + `plan.md` Risks |
| **M3** | Host-matcher unit tests + allowlist-only CDN policy **gate** network→classify always-on; else collect-only / flagged | `phase-01` + `phase-02` |

Validate’s `COOK_READY_WITH_CONCERNS` understated M2/M3 as soft cook notes — treat as **plan locks**, not engineer judgment.

## NICE (do not block cook start)

| # | Item |
|---|------|
| N1 | Paste/bind R2 A1–A7 into metrics baseline during phase 4 (numbers already in phase-04 table — execution) |
| N2 | A3 HITL labels = measurement gate only (agree with validate) |
| N3 | Mark phase-5 todos done / link runbook (`ops-260813-track-b-access-runbook.md` exists) |
| N4 | Explicit extension/desktop parity follow-up slug |
| N5 | Freeze footnote: live n may drift; invariant is `unknown×ok=0` |
| N6 | Fold `networkHits` like `platformHits` + `method=network` (already implied) |

## Consistency vs validate-0817

| Validate claim | Red-team |
|----------------|----------|
| Phases 1–4 cookable / deps DAG clean | **Agree** |
| KPIs match live `unknown×ok=0` | **Agree** |
| Track B separated | **Agree** |
| COOK_READY_WITH_CONCERNS (A1–A7 bind, A3 labels, n drift) | **Partial** — those are NICE/measurement; **M1–M3 are stronger and must be fixed in plan before cook** |

## Residual risks after M1–M3

- Network may miss pixels that never fire headless → A1/A2 under-shoot (measurement, not ethics).  
- Opt-in settle may stay unused → MO value unproven until A/B.  
- Extension lag confuses users if marketing says “platform evidence” without CLI qualifier.

## STATUS: DONE_WITH_CONCERNS

Concerns = **M1–M3 must be edited into the plan** (copy/KPI gate, settle default+budget semantics, matcher-before-always-on). After those three plan locks, cook phases 1→2∥3→4. Do not block on A3 labels or phase-5 checkbox hygiene.
