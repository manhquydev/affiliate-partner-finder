# Track A metrics baseline (R2 A1–A7 freeze)

**Timestamp:** 2026-08-13  
**Sources:** `plans/260813-0816-network-lazy-settle-quality-track-a/phase-04-tests-golden-metrics.md`, `plans/reports/validate-260813-0815-apf-quality-upgrade-r2.md` §5  
**Cohort freeze:** n≈3659 / 7465 (~49% coverage), ~2026-08-13 design-full-10k merge

## Ship rules

- Track A KPIs = **A1–A7 only**. Never claim `unknown%`↓ (that is Track B / A8 report-only).
- **Do NOT** enable `--lazy-settle` (or network→classify) on the live cooling 10k shards mid-flight.
- Measure on a **copy / separate `--out`** sample job; keep shard argv unchanged unless user approves an A/B relaunch.
- A3 HITL labels are a **measurement gate**, not a blocker for phases 1–3 code. Labels **not collected in this cook**.

## Cohort snapshot (freeze)

| Metric | Value |
|--------|------:|
| Completed rows | ~3659 / 7465 |
| `loadStatus=ok` | 2514 |
| affiliate among ok | 161 → **6.40%** |
| `none@ok` (FN pool) | **1739** |
| affiliates with nonempty `platformHits` | **12 / 161** (7.5%) |
| unknown | 1145 (31.3%) = blocked 588 + timeout 530 + error 27 |
| unknown × ok | **0** |

## R2 A1–A7 binding

| ID | Metric | Freeze | Target | Pass when |
|----|--------|--------|--------|-----------|
| **A1** | affiliate% among ok | 161/2514 = **6.40%** | +≥1.0 pp → **≥7.40%** | Same ≥200 prior-`ok` domains re-scanned with flags vs control |
| **A2** | platform / network hits | **12** platform nonempty | ≥5× (**≥60**) **or** ≥40 `method=network` on 200-site A/B | jsonl `evidence.platformHits` + full CSV `method` |
| **A3** | none→positive on labeled FN | **unlabeled** (deferred) | ≥8 true flips on 30–50 HITL labels, precision ≥90% | Later: `plans/reports/fn-sample-*.csv` — **not blocking this report** |
| **A4** | false affiliate on golden none | **5** none golden cases | **0** new affiliate | `GOLDEN_CASES` + `npm test` |
| **A5** | golden / classify suite | green | stay green | `npm test` |
| **A6** | added latency | settle **1200ms** fixed today | mean ≤ **+1.5s/page**; p90 scan ≤ **+5%** vs control | Paired timings on sample (control vs `--lazy-settle` / network) |
| **A7** | throughput @3×3 | noisy ~**25–90/h** | no worse than **−10%** vs control window | shard-monitor / CSV rate; **if A6 vs A7 conflict → A7 wins** (keep flag OFF / tighten budget) |

**Track A DoD:** (A1 ∨ A2 ∨ A3) + A4 + A5 + A6 + A7.  
**Non-metric:** A8 `unknown%` 31.3% — report only; Track B owns movement (`ops-260813-track-b-access-runbook.md`).

## Measurement recipe — `none@ok` sample

Goal: numeric before/after for network evidence and/or `--lazy-settle` without touching live shard `--out` dirs.

### 1. Build a fixed domain list from merge (control snapshot)

Prefer full technical export (`results.full.csv` / `results.jsonl`) so `loadStatus` + `verdict` are available. End-user `results.csv` alone lacks loadStatus.

```bash
# Example: from a merged or shard jsonl — pick none@ok, prefer low link density
node --input-type=module -e '
import { readFileSync, writeFileSync } from "node:fs";
const path = process.argv[1];
const rows = readFileSync(path, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
const pool = rows.filter((r) => r.loadStatus === "ok" && r.verdict === "none");
const low = pool.filter((r) => (r.evidence?.totalLinks ?? 999) < 20);
const pick = (low.length >= 50 ? low : pool).slice(0, 200);
writeFileSync("plans/reports/track-a-none-ok-sample-domains.txt", pick.map((r) => r.domain).join("\n") + "\n");
console.log({ pool: pool.length, lowLinks: low.length, sample: pick.length });
' ./out/design-full-10k-merge/results.jsonl
```

Also keep a **≥200 `ok`** stratified mix (affiliate + none) for A1/A2 if measuring affiliate%.

### 2. Control vs treatment (separate job dirs)

| Arm | Flags | Notes |
|-----|-------|-------|
| **Control** | same ethics as shards: `--scan-profile --concurrency ≤3 --delay-ms ≥1000`; **no** `--lazy-settle` | Matches freeze settle = 1200ms sleep |
| **Treatment A** | control + network evidence (when phase-2 ships) | Observe-only / classify per phase-1 gate |
| **Treatment B** | control + `--lazy-settle` | Replaces 1200ms; budget ≤1200ms; **not** on live 10k |

```bash
# Treatment B example — NEW out dir only
npm run scan -- --resume --out ./out/track-a-sample-lazy \
  --scan-profile --accept-failures --concurrency 2 --early-exit \
  --lazy-settle
```

Do **not** pass `--lazy-settle` into `design-full-10k-shards/shard-*` relaunch argv.

### 3. Compare deltas

For each domain in the sample file:

| Field | Control | Treatment | Δ of interest |
|-------|---------|-----------|---------------|
| `verdict` | freeze / control re-scan | treatment | none→affiliate / partner_trade (A1/A3) |
| `evidence.platformHits` | | | nonempty lift (A2) |
| `method` (full CSV) | | | `network` count (A2) |
| `evidence.totalLinks` | | | lazy-settle signal (MO) |
| per-page elapsed | | | A6 |
| companies/h window | | | A7 |

Pass heuristics:

- **A1:** affiliate% on the fixed ok cohort ≥ 7.40% **or** +1.0 pp vs control arm on same domains.  
- **A2:** ≥60 platform-nonempty **or** ≥40 network-method on 200-site A/B.  
- **A4/A5:** `npm test` + golden none stay non-affiliate.  
- **A6/A7:** if throughput drops >10%, disable treatment flags (A7 > A6).

### 4. Artefacts to store under `plans/reports/`

| Artefact | Purpose |
|----------|---------|
| `metrics-260813-track-a-baseline.md` (this file) | Freeze + recipe |
| `track-a-none-ok-sample-domains.txt` (when generated) | Fixed sample |
| `fn-sample-*.csv` (later) | A3 HITL labels — **deferred** |
| Paired control/treatment timing notes | A6/A7 |

## Explicit out of scope here

- Collecting A3 HITL labels  
- Enabling flags on live 10k  
- Claiming unknown% improvement from Track A code  
- Phase-1/2 matcher unit tests (separate cook; gate network→classify)
