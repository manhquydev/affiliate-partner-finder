# Validate Report: APF quality-upgrade feasibility (r2)

**Timestamp:** 2026-08-13 08:15 +07  
**Role:** VALIDATE R2 (read + write report only — no product code changes, no commit, no scan kill)  
**Re-validates:** `validate-260813-0810-apf-quality-upgrade-r1.md` + `redteam-260813-0810-apf-quality-upgrade-r1.md`  
**Against:** live merge artefacts + `lib/classify.ts` row-1 policy  
**Stack cited:** `lib/classify.ts`, `lib/detector.ts`, `cli/scan.ts`, `cli/browser.ts`, `test/fixtures/golden.ts`

## Verdict (one line)

R1 + redteam **hold**: `unknown×ok = 0` at **n=3659**; A+B plan-ready for false-`none` on `ok`; Track C (access/HITL) required if KPI is `unknown%`; LLM-on-unknown **FAIL**.

## 1. Live snapshot (R2 freeze)

| Component | State |
|-----------|--------|
| Shard workers | 3× `npm run scan --resume` still alive (Xvfb, `--concurrency 3 --early-exit --scan-profile --accept-failures`) |
| Monitor | `scripts/shard-monitor-loop.sh` PID 450316; state `total: 3659` |
| Target | **7465** (`shard-manifest.json`) |
| Merged done | **3659** (`results.full.csv` = `results.merged.jsonl`) ≈ **49.0%** |
| Per-shard progress | 994 / 987 / 991 (sum 2972 + `completedInSource` 688 ≈ merge) |
| Root `progress.json` | still stale `completed: 688` — **do not trust** for live % |

### Throughput (CSV `scannedAt`)

| Window | Rate |
|--------|-----:|
| Full span (~33.8 h) | ~108 /h |
| Last 8 h / 4 h / 2 h / 1 h | ~92 / ~71 / ~48 / **~25** /h |

Cooling confirmed (redteam concern still open). Not touched this round.

## 2. Exact contingency: `verdict` × `loadStatus` (n=3659)

Source: `out/design-full-10k/results.full.csv` at 2026-08-13 08:14 +07 (monitor merge).

| verdict \ loadStatus | blocked | timeout | error | ok | **row Σ** |
|----------------------|--------:|--------:|------:|---:|----------:|
| `unknown` | **588** | **530** | **27** | **0** | **1145** |
| `none` | 0 | 0 | 0 | **1739** | **1739** |
| `affiliate` | 0 | 0 | 0 | **161** | **161** |
| `partner_trade` | 0 | 0 | 0 | **614** | **614** |
| **col Σ** | **588** | **530** | **27** | **2514** | **3659** |

### Assertions (all true)

1. Grand **n = 3659** (= CSV rows = jsonl lines = monitor `total`).  
2. `unknown × ok = 0`.  
3. `unknown` row Σ = 588+530+27 = **1145** = 100% of unknowns = load ≠ ok.  
4. Every `ok` row is one of `none` / `affiliate` / `partner_trade` (never `unknown`).  
5. Matches `classify` row 1: `loadStatus !== 'ok'` ⇒ `{ verdict: 'unknown', confidence: 'blocked' }`.

### Rates at n=3659

| Metric | Count | % |
|--------|------:|--:|
| `none` | 1739 | **47.5%** |
| `unknown` | 1145 | **31.3%** |
| `partner_trade` | 614 | **16.8%** |
| `affiliate` | 161 | **4.4%** |
| `loadStatus=ok` | 2514 | **68.7%** |
| `affiliate` among `ok` | 161/2514 | **6.40%** |
| `none` among `ok` (FN pool) | 1739/2514 | **69.17%** |
| Affiliates with nonempty `platformHits` (jsonl) | **12/161** | — |
| Positive CSV `method=platform` | **12** | (vs link 670, path 93) |
| `none@ok` with `evidence.totalLinks < 20` | **149/1739** | **8.6%** |

### Drift vs validate R1 (n=3655)

| Slice | R1 | R2 | Δ |
|-------|---:|---:|--:|
| n | 3655 | **3659** | +4 |
| `unknown` (blocked/timeout/error) | 1145 (588/530/27) | **same** | 0 |
| `unknown × ok` | 0 | **0** | 0 |
| `none` | 1736 | **1739** | +3 |
| `affiliate` | 160 | **161** | +1 |
| `partner_trade` | 614 | **614** | 0 |

**Conclusion:** R1/redteam diagnosis is **stable under live growth** — new rows are almost all successful `ok` classifications; the unknown composition did not acquire any `ok` “unsure” bucket.

## 3. Redteam R1 conclusions — re-check

| Redteam claim | R2 verdict | Evidence |
|---------------|------------|----------|
| 31.3% `unknown` is access/timeout/CF, not lazy-DOM miss | **CONFIRMED** | contingency §2 |
| Network + MO attack **false-`none` on `ok`**, not raw `unknown%` | **CONFIRMED** | `none@ok`=1739; `unknown×ok`=0 |
| Using raw `unknown%` as success for A/B = metric lie | **CONFIRMED** | classify policy + live table |
| Separate KPI tracks (access-unknown vs evidence-FN) | **REQUIRED for plan** | §4–5 |
| Do not LLM all unknowns / port Crawl4AI-as-core / CF bypass | **CONFIRMED hold** | ethics + empty evidenceUrl on 1145/1145 unknowns |
| Throughput cooling / ETA risk | **STILL OPEN** | ~25/h last hour |
| Labeled FN sample missing | **STILL OPEN** | golden=13 unit fixtures only |

## 4. Pass/Fail gates (plan entry)

Gates renamed to match ops Outcome Contract (not validate-R1’s A/B/C=LLM/D=blockRequests).

| Gate | Proposal | Feasible? | Effort | Risk | Plan-ready? | **Pass/Fail** |
|------|----------|-----------|--------|------|-------------|---------------|
| **A** | Network evidence (`page.on` + host/CDN table → `method=network`) | Yes (CLI Playwright) | M | Med (FP hosts; extension parity gap) | Yes — CLI-first; goal = FN/platform recall on `ok` | **PASS** |
| **B** | MutationObserver + bounded scroll settle | Yes (`settle` today = `waitForTimeout(1200)` only) | S | Low–Med (budget/ETA) | Yes — flag; ≤1–2s; abort on early-exit | **PASS** |
| **C** | Access / timeout / HITL improvements (no bypass) | Yes (ops + light retry/timeout policy) | S–M | Med if retries amplify ETA; ethics OK if HITL-only | Yes as **Track B** — only lever that can move 31.3% unknown | **PASS** |
| **D** | LLM on `unknown` (research HyperAgent-style) | Technically yes; **wrong gate** vs live data | L | High (cost, nondeterminism, empty pages) | No as stated | **FAIL** |

### Gate notes

**A — PASS.** Hook before `goto` in `cli/scan.ts`; match hosts with same boundary rules as `isPlatformHost`; fold into `platformHits` or `networkHits`; bump `detectorVersion`. Primary metric is **not** `unknown%`. Extension `lib/scan.ts` lacks Playwright — declare CLI-first / phase-2 parity.

**B — PASS.** Complements A for lazy widgets; measure on `none@ok` especially `totalLinks<20` (149). Must not be sold as unknown↓.

**C — PASS (separate workstream).** Redteam P0 if product KPI includes unknown%. Scope: per-shard CF HITL playbook, timeout/retry only on fail statuses, monitor stall vs `desktop/eta.ts` 8m — **no** CAPTCHA/CF solve, **no** concurrency >3 per process. Do not bury C inside the network PR.

**D — FAIL.** All 1145 unknowns have `confidence=blocked`, empty `evidenceUrl`, non-ok load. LLM cannot invent a successful load. Re-scope (if ever) to `--llm-disambiguate` on **`ok` + contested** (`partner_trade` low / rich `none`) after A+B measured; default off; ≤5–10% of `ok`. Hold out of `ak:plan` MVP.

`blockRequests` (research #4): not a numbered gate here; remains **deferred throughput experiment after A**, kill-switch if recall drops — same as R1.

## 5. Acceptance metrics for `ak:plan`

Baseline freeze: **n=3659**, rates in §2. Split tracks explicitly.

### Track A — Evidence quality (network + MO) — primary MVP

| ID | Metric | Baseline | Target | Measurement method |
|----|--------|----------|--------|--------------------|
| **A1** | `affiliate%` among `loadStatus=ok` | 161/2514 = **6.40%** | **+≥1.0 pp absolute** on same cohort re-scan (≥7.40%) | Flag A/B: re-scan fixed sample of **≥200** prior `ok` domains from this merge (or full shard sample); compare verdict mix |
| **A2** | Rows with nonempty `platformHits` **or** `method∈{platform,network}` among affiliates | **12** platform | **≥5×** (≥60) on re-scan of same affiliate+none sample, **or** ≥40 network-method hits on 200-site A/B | jsonl `evidence.platformHits` + CSV `method` |
| **A3** | `none → {affiliate,partner_trade}` conversions on labeled FN / network-heavy subset | unlabeled | **≥8** true conversions on a **30–50** HITL-labeled slice of current `none@ok` (precision ≥90% on those flips) | Manual labels before cook; store as golden extension or `plans/reports/fn-sample-*.csv` |
| **A4** | False-affiliate on known-none | golden **5** none cases | **0** new affiliate on none-golden | `GOLDEN_CASES` (13 cases: 4 aff / 3 partner / 5 none / 1 unknown) + `npm test` |
| **A5** | Golden classify suite | green | stay green | `npm test` / classify golden |
| **A6** | p50 added latency (B settle + A observe) | settle 1200 ms today | **≤ +1.5 s/page** mean vs control; p90 scan time **≤ +5%** | `--scan-profile` timings on 200-run A/B |
| **A7** | Throughput @ 3×3 | noisy; recent ~25–90/h | **no worse than −10%** vs paired control window | shard-monitor companies/h on A/B flags |
| **A8** | Raw `unknown%` | 31.3% | **not a success/fail metric for A/B** (expect ≈0 Δ) | report only |

**Track A DoD:** A1+A2 up (or A3 met), A4+A5 green, A6+A7 within budget. **Not** A8.

### Track B — Access-unknown (gate C) — required iff product owns `unknown%`

| ID | Metric | Baseline | Target | Measurement method |
|----|--------|----------|--------|--------------------|
| **B1** | Access-unknown% = `(blocked+timeout+error)/n` = `unknown%` today | **31.3%** (1145/3659) | **≤20%** on next contiguous **≥500** completed rows (stretch ≤15%) | merge CSV after HITL/timeout changes; do not mix with flag-A/B on same rows without marking |
| **B2** | `unknown × ok` | **0** | stay **0** unless product explicitly adds evidence-unknown | contingency table script |
| **B3** | Aggregate companies/h | cooling ~25/h last hour | recover toward **≥120/h** sustained (stretch 150) without raising concurrency | monitor + CSV rate windows |
| **B4** | Ethics | concurrency ≤3; no bypass | unchanged | code review + ops checklist |

**Track B DoD:** B1 met on ≥500-row window; B2+B4 hold; B3 trend improving.

### Explicit non-metrics / rejects

- LLM call volume / `$` on current `unknown` set — **out of plan**.  
- GitHub stars / “AI crawl” narrative — vanity.  
- Raising concurrency to “fix” unknown — **reject**.

## 6. Gaps still blocking a clean cook (carry into plan)

1. **No labeled FN sample** (A3) — plan must include 30–50 HITL labels before claiming lift.  
2. **Host/CDN alias table** TBD (Impact/Awin track hosts beyond brand tokens in `AFFILIATE_PLATFORMS`).  
3. **CLI vs extension parity** — network listener CLI-only for MVP.  
4. **Evidence schema** — add `network` method / version bump; jsonl already has `platformHits`.  
5. **Outcome Contract** — user must approve Track A vs A+B scope before `ak:plan` (ops packet).  
6. **Throughput cooling** — ops risk parallel to quality; do not add uncapped settle on hot path.

## 7. Handoff recommendation

| Enter `ak:plan` | Hold |
|-----------------|------|
| **A** Network evidence (CLI) | **D** LLM-on-unknown as specified |
| **B** Bounded MO settle (flag) | Full Crawl4AI / browser-use / Firecrawl core |
| **C** Access-unknown Track B (ops KPI + light retry) if Outcome Contract includes unknown% | Stealth / CAPTCHA / concurrency >3 |
| Acceptance = §5 tables | Selling A/B as unknown%-fix |

Plan order: **A → B** (quality MVP) ∥ **C** (ops track); never enable broad `blockRequests` with network matching; D only after A+B measured and re-scoped to `ok` rows.

## STATUS: DONE_WITH_CONCERNS

Concerns: (1) research “unknown↓ from network/MO” still misaligned — plan must not inherit it; (2) A3 labeled FN sample not yet collected; (3) live rate ~25/h last hour — ETA/ops risk outside quality code path.
