# Red-team R2 — APF quality upgrade (P0 attack + 2-track plan)

**Timestamp:** 2026-08-13 08:15–08:20 +07  
**Agent:** RED-TEAM R2 (read + write report only; no product code changes; no commit; scan processes left running)  
**Inputs:** live `out/design-full-10k/results.full.csv` + `results.merged.jsonl` + R1 `plans/reports/redteam-260813-0810-apf-quality-upgrade-r1.md` + validate R1 + research-0802  
**Prior claim under attack:** research / R1 TOP-1 framing that **network evidence** is the lead quality move for “unknown↓”

---

## 0. Verdict (one line)

**R1’s access diagnosis is confirmed with concrete counts; “network evidence” is P0 for Track A (false-`none` on `ok`) only — overall / unknown% P0 must be Track B (access / HITL / timeout / resume).**

---

## 1. Re-verify — concrete counts (R2 snapshot)

**Sources:** `out/design-full-10k/results.full.csv` and `results.merged.jsonl` — **n = 3659** both (CSV ↔ jsonl row count match).  
**Queue:** 7465 (`shard-manifest.json`). **Coverage:** 3659 / 7465 ≈ **49.0%**.  
**Monitor:** `plans/reports/shard-monitor-state.json` → `total: 3659`.

### 1.1 Verdict distribution (CSV = jsonl)

| Verdict | Count | % of 3659 | R1 (n=3655) | Δ |
|---------|------:|----------:|------------:|--:|
| `none` | **1739** | **47.5%** | 1736 | +3 |
| `unknown` | **1145** | **31.3%** | 1145 | 0 |
| `partner_trade` | **614** | **16.8%** | 614 | 0 |
| `affiliate` | **161** | **4.4%** | 160 | +1 |
| Positive (`affiliate`+`partner_trade`) | **775** | **21.2%** | 774 | +1 |

Drift since R1: +4 completed rows, all `loadStatus=ok` (unknown absolute count **unchanged**).

### 1.2 `unknown` × `loadStatus` (CSV **and** jsonl identical)

| `loadStatus` | Count | % of unknown | % of all rows |
|--------------|------:|-------------:|--------------:|
| `blocked` | **588** | **51.4%** | 16.1% |
| `timeout` | **530** | **46.3%** | 14.5% |
| `error` | **27** | **2.4%** | 0.7% |
| `ok` | **0** | **0.0%** | — |
| **Total unknown** | **1145** | **100%** | **31.3%** |

| Check | Result |
|-------|--------|
| Failed loads (`blocked`+`timeout`+`error`) | **1145** |
| Failed-load verdicts | **100% `unknown`** (0 positives / 0 `none` on fail) |
| `unknown` with empty `evidenceUrl` (CSV) | **1145 / 1145** |
| `unknown` `confidence` | **all `blocked`** |
| `unknown` with any `linkHits`/`platformHits`/`pathHits` | **0 / 1145** |
| `loadStatus=ok` rows | **2514** (68.7%) — **never** `unknown` |

**Reconfirm R1:** unknown ≈ 31% is **access / timeout / error**, not “ok page missing DOM signals.”

### 1.3 Affiliate × empty `platformHits` (jsonl `evidence.platformHits`)

| Slice | Count | Note |
|-------|------:|------|
| `affiliate` total | **161** | |
| `affiliate` with **empty** `platformHits` | **149** | **92.5%** |
| `affiliate` with **nonempty** `platformHits` | **12** | **7.5%** — hosts seen: uppromote, awin, tapfiliate, refersion, goaffpro, multi-network demo |
| `partner_trade` empty `platformHits` | **614 / 614** | **100%** |
| Positives without `platformHits` | **763 / 775** | **98.5%** |

CSV `method` on positives (flat export):

| method | affiliate | all positives |
|--------|----------:|--------------:|
| `link` | 92 | **670** |
| `path` | 57 | **93** |
| `platform` | **12** | **12** |

**Implication:** network-host evidence still has a real gap vs DOM `platform` (only 12 hits) — but that gap lives almost entirely on **`ok` pages that already classified positive via link/path**, or on **`none@ok` FN candidates**, **not** inside the unknown bucket.

### 1.4 Addressable FN pool (Track A surface)

| Slice | Count | % |
|-------|------:|--:|
| `none` ∩ `loadStatus=ok` | **1739** | 47.5% of all; **69.2%** of ok |
| ok positive rate | 775 / 2514 | **30.8%** |
| ok pages | 2514 | 68.7% |

### 1.5 Throughput / resume reliability (Track B pressure)

| Window (by CSV `scannedAt`) | n | rate | unknown% in window |
|-----------------------------|--:|-----:|--------------------:|
| Full span ~33.8 h | 3659 | **~108/h** | 31.3% |
| Last 8 h | 738 | ~92/h | 32.4% |
| Last 4 h | 285 | ~71/h | 29.5% |
| Last 2 h | 95 | ~48/h | 29.5% |
| Last 1 h | 25 | **~25/h** | 28.0% |

| Ops signal | Value |
|------------|------:|
| Shard progress completed | 994 + 987 + 992 = **2973** / 6777 |
| Shard jsonl sum + `completedInSource` 688 | **3661** vs merged **3659** (**−2** merge/dedupe skew) |
| `out/design-full-10k/progress.json` | still stale vs live merge (trust CSV/monitor) |

Cooling rate + merge off-by-2 = **resume / monitor reliability is already hurting finish-At**, independent of detector quality.

---

## 2. Attack — is “network evidence” still P0?

### 2.1 What R1 actually said (tension)

| Surface in R1 | Ranking |
|---------------|---------|
| Priority table | **P0** = KPI split + **access/HITL/timeout**; network = **P1** |
| TOP 3 list | **TOP 1 = network**; TOP 2 = access |

That TOP-1 vs P0 mismatch is the ship risk: cooks will implement **network first** and claim a “quality upgrade” while **unknown% stays ~31%**.

### 2.2 Kill criteria for “network as overall P0”

| Claim | Evidence | Survive? |
|-------|----------|----------|
| Network ↓ raw `unknown%` | 0/1145 unknowns are `ok`; no DOM/network payload to match | **FAIL** |
| Network fixes “missing platform DOM” as the main quality hole | 12 platform hits; 149/161 affiliates already won via link/path | **Partial** — real but secondary |
| Network is cheapest ETA-safe lift on `ok` | Observe-only `request`/`response` ≈ yes | **PASS for Track A** |
| Access/HITL/timeout is the only lever for unknown≈31% | 588+530+27 = 1145; classify maps fail→unknown | **PASS — overall P0** |
| Resume/monitor reliability is cosmetic | rate 108→25/h; merge 3661 vs 3659; stale progress.json | **FAIL as “cosmetic”** — Track B co-P0 |

### 2.3 Corrected priority (R2)

| Priority | Item | Scope |
|----------|------|--------|
| **P0 (overall / unknown%)** | **Track B:** access · CF HITL per shard profile · timeout/retry policy · resume/merge/monitor correctness · stall recovery | Moves the 31.3% bucket |
| **P0 (Track A only)** | **Network host evidence** (observe-only) + metrics gated to `loadStatus=ok` | FN↓ / platform recall; **expect unknown% Δ ≈ 0** |
| **P1** | Bounded MutationObserver + scroll settle (flag, ≤1–2s, abort on early-exit) | Complements network on lazy widgets |
| **P2** | LLM only on **ok + inconclusive / low-conf none** (misnamed if tied to unknown); default off | After A+B baselines |
| **Không làm gì** | Crawl4AI / browser-use / Firecrawl-core / stealth CF bypass / LLM-on-all-unknown / concurrency &gt;3 | Unchanged from R1 |

**Bottom line:** Do **not** call network “the P0 quality upgrade” in plan/ship copy unless the success metric is explicitly **Track A**. If the KPI slide still shows `unknown%`, **P0 is access/HITL/timeout/resume**.

---

## 3. Two-track plan + metrics

### Track A — Quality on `ok` (false-`none` / platform miss)

**Goal:** Raise true affiliate/partner recall on successfully loaded pages without pretending to fix CF/timeouts.

| Work item | What | Order |
|-----------|------|-------|
| A1 | Network host evidence: `page.on('request'|'response')` + host table; `method=network`; merge into classify | First |
| A2 | MutationObserver + bounded settle; flag default short/off if ETA regresses | Second |
| A3 | Optional LLM extract on **ok + none/low-conf** sample only | Later |

| Metric | Baseline (R2) | Target (next measured slice) | Guard |
|--------|---------------|------------------------------|-------|
| Positive rate among `ok` | **30.8%** (775/2514) | **+3–5 pp** on A/B or golden set | No ↑ false-affiliate on none-golden |
| `none@ok` count / share of ok | 1739 / 69.2% | ↓ vs control on same domains | — |
| `method=platform` or `method=network` hits | platform **12** | network adds measurable hits on ok | Observe-only (no heavy `route`) |
| Affiliate empty `platformHits` | **149/161 (92.5%)** | ↓ among *new* network-detectable sites (not forced on link-only programs) | — |
| Raw `unknown%` | 31.3% | **unchanged is success** for Track A | Do not gate A ship on unknown↓ |
| p50/p90 page time | (measure before) | Δ ≤ **+5%** (network); settle ≤ **+1.5s** if enabled | Disable settle if medium-window rate drops &gt;10% |

### Track B — Reduce blocked / timeout (access-unknown)

**Goal:** Cut failed opens that classify as `unknown`; restore scan rate so 10k finish is predictable.

| Work item | What | Order |
|-----------|------|-------|
| B1 | Per-shard CF HITL playbook (human pass on shared profile); verify cookies on scan path | Immediate ops |
| B2 | Timeout / retry only on `blocked`/`timeout` (budgeted); no concurrency raise | Eng + ops |
| B3 | Resume / merge / monitor correctness (fix 3661 vs 3659 skew; stop trusting stale `progress.json`) | Ops eng |
| B4 | Stall recovery aligned with desktop ETA (`STALL_MS` 8m) — detect cooling &lt;~30/h | Ops |

| Metric | Baseline (R2) | Target | Guard |
|--------|---------------|--------|-------|
| Access-unknown% = (blocked+timeout+error)/completed | **31.3%** (1145/3659) | **≤20%** on next contiguous ≥500 rows (stretch ≤15%) | **No** CF bypass; concurrency ≤3/process |
| `blocked` share of unknown | 51.4% (588) | ↓ via HITL/profile health | — |
| `timeout` share of unknown | 46.3% (530) | ↓ via retry/timeout tuning | Retries only on fail; no extra work on ok |
| Companies/h (recent 1–2 h) | **~25–48/h** | recover toward **≥100–120/h** sustained | Ethics clamp intact |
| Merge consistency | shard sum+688 = 3661 vs merge 3659 | **0** unexplained delta | Dedup policy documented |
| `unknown` ∩ `ok` | **0** | stay **0** until product defines evidence-unknown | New ok-unknown only if classify policy changes intentionally |

### Dual-KPI dashboard (mandatory)

| KPI | Formula | Owner track |
|-----|---------|-------------|
| **A — evidence quality** | positives / `ok` ; FN on golden ; network/platform method counts | Track A |
| **B — access reliability** | (blocked+timeout+error) / completed ; companies/h ; merge delta | Track B |
| **Deprecated as sole success** | raw `unknown%` without A/B split | — |

---

## 4. Misdirection residual risks

| Move | Why it still fails |
|------|--------------------|
| Ship network and celebrate “quality done” | unknown% flat; marketing lie |
| LLM / stealth on current unknown set | empty pages; ethics / $ burn |
| Raise shard concurrency to “fix” timeout | likely more CF → worse B |
| Asset `blockRequests` before network A/B | may kill the pixels Track A needs |
| Treat empty `platformHits` on link-won affiliates as bugs | most programs are first-party `/affiliate` pages — expected |

---

## 5. Handoff

1. **Plan/cook:** split epics **Track A** (network → MO) vs **Track B** (HITL/timeout/resume).  
2. **Ship copy:** network is **P0-A**, not overall P0.  
3. **Ops now:** HITL pass + rate recovery before stacking per-page settle latency.  
4. Re-freeze CSV/jsonl snapshot when claiming metric lift.

---

## 6. STATUS

**STATUS: DONE_WITH_CONCERNS**

Concerns: (1) live scan still cooling (~25/h last hour); (2) merge count skew −2; (3) R1 TOP-1 vs P0 wording still easy to mis-implement — this R2 overrides overall P0 to Track B.
