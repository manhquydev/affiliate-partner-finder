---
type: scout
date: 2026-08-27
scope: out/, plans/reports/, cohort JSON, A/B dirs, golden, 10k shards
---

# Scout: Data artifacts (n=200 gate, golden, 10k recoverability)

## Summary

On-disk scan jobs under `out/` are **Track S only**. The n=200 throughput gate is **DIRECTIONAL n=61**, both A/B arms complete and re-runnable. Golden fixtures + `verify-golden.mjs` exist; live gate on current A/B exports is **FAIL** (7/11 present of 13; affiliate-high 3/4). The design-full-10k shard job is **not recoverable from this workspace**: `out/design-full-10k` and `out/design-full-10k-shards` are gone, last monitor tick **6342/7465 (85.0%)** on 2026-08-14 08:18 +07.

`out/` is gitignored. `*.log` is gitignored. Scan results and the 10k paper trail were never in git.

## Findings

### 1. `out/` inventory (2026-08-27, this tree)

Six job dirs. No `design-full-10k*`, no `design-pilot-200*`, no `track-a-*`.

| Dir | companies | progress | results | Role |
|-----|----------:|----------|---------|------|
| `out/track-s-ab-control/` | 61 | 61/61 scan `2026-08-26T19:47:42Z` | json/jsonl/csv/full.csv | Track S A/B control (`--scan-profile`, no `--probe-parallel`) |
| `out/track-s-ab-treatment/` | 61 | 61/61 scan `2026-08-27T02:04:08Z` | json/jsonl/csv/full.csv | Track S A/B treatment (`--probe-parallel`) |
| `out/track-s-trial-control/` | 3 | 3/3 | json/jsonl/csv | Micro trial control |
| `out/track-s-trial-treatment/` | 3 | 3/3 | json/jsonl/csv | Micro trial treatment |
| `out/track-s-smoke/` | **200** | **0/200** | none | Seed only. 40 scored companies + **160 `track-s-pad-NNN.invalid` stubs**. Not a real 200 cohort. |
| `out/track-s-smoke-test/` | 61 | **0/61** | none | Cohort seed smoke; never scanned |

A/B file set (both arms): `companies.json`, `progress.json`, `results.json`, `results.jsonl`, `results.csv` (simple `ket_qua`), `results.full.csv` (audit schema from `docs/06-data-schema.md`).

Paired domains: **61/61**. Current JSONL cross-domain `finalUrl` host ≠ company domain: **0/61** both arms (post-isolation rerun). Earlier contaminated run documented in `plans/reports/check-track-s-rerun.md` was overwritten by `scripts/track-s-ab.sh` (`rm -rf` both outs).

Load/verdict on latest A/B:

| Arm | ok | blocked | timeout | affiliate | partner_trade | none | unknown |
|-----|---:|--------:|--------:|----------:|--------------:|-----:|--------:|
| Control | 53 | 6 | 2 | 8 | 5 | 40 | 8 |
| Treatment | 51 | 8 | 2 | 7 | 5 | 39 | 10 |

Metrics: `plans/reports/metrics-track-s-ab.md` — wall 1098s vs 685s (**37.6%**), `GATE: PASS (directional-throughput)`, banner `n<200`.

Chrome profiles present: `~/.cache/affiliate-partner-finder/chrome-profile`, `chrome-profile-desktop`. **No** `chrome-profile-shard*`. No live `design-full-10k` / shard processes.

### 2. Cohort JSON (plans/reports/)

| File | n | target | Notes |
|------|--:|-------:|-------|
| `plans/reports/track-s-benchmark-cohort-200.json` | **61** | 200 | `directional: true`, created 2026-08-26T12:22:30Z, source `track-a-ab + track-a-none-ok + golden domains` |
| `plans/reports/track-s-micro-cohort.json` | 3 | 3 | Slice `[0..3)` of the 61; trial PASS |
| `plans/reports/track-a-ab-sample-companies.json` | 40 | — | Track A sample list (not a job dir) |
| `plans/reports/track-a-none-ok-sample-domains.txt` | 49 lines | — | Domain list used in Track S merge |
| `docs/data/sample-companies.json` | 30 domains | — | Tiny collect snapshot (query `design`, pages 1–3) |

**Why n=61 not 200:** `scripts/build-track-s-cohort.mjs` prefers `out/design-pilot-200/companies.json` if `length >= 200`. That dir is **missing**, so it merges Track A sample (40) + none-ok txt + a hardcoded golden-ish list, then dedupes. `metrics-track-s-baseline.md`: “Recover pilot-200 for full n=200 gate.”

Golden domains **in** the 61: 11/13. **Missing from cohort (and from A/B results):** `thorvalddesign.com`, `pazzodesign.it`. Builder list includes `lehtodesign.com` and `nordicnest.com` instead of those two none-cases.

`out/track-s-smoke/companies.json` **cannot** fill the 200-row hole: unique 200, but 160 rows are `*.invalid` pads.

### 3. n=200 gate data — what exists vs what the phase requires

Phase 4 (`plans/260826-1909-cli-throughput-track-s/phase-04-ab-gate-cohort-200.md`) wants both arms **200/200**. Actual:

| Requirement | Status |
|-------------|--------|
| Cohort file | Present, **n=61 DIRECTIONAL** |
| Seed + scan script | `scripts/track-s-ab.sh` (wipes + reseeds; refuses `*design-full-10k*`; allowlist `out/track-s-*`) |
| Control complete | **61/61** |
| Treatment complete | **61/61** |
| Metrics `GATE:` line | `PASS (directional-throughput)` |
| Production n=200 claim | **Not possible** until pilot-200 companies recovered or re-collected |
| Isolation of this A/B | Current JSONL: 0 cross-domain (usable as directional evidence) |

Recoverability of **this** gate: **high**. JSONL is append-only checkpoint; `progress.json` matches result counts; `npm run track-s:ab` can rebuild from the committed 61-row JSON. Timing-only diagnostic dir `out/track-s-timing-smoke` was never created.

### 4. Golden

**Authoritative unit set:** `test/fixtures/golden.ts` — 13 sites, v1 decision table (not legacy `docs/data/test-results.json` labels).

**Live verifier:** `test/verify-golden.mjs <results.json>` (docs/07 §2 + §5). No `--check-urls` in this scout.

**Source capture:** `docs/data/test-results.json` (2026-08-10, 13 targets: affiliate 4 / partner 3 / none 5 / unknown 1 / blocked 1).

**This session, against current A/B `results.json` (both arms identical matrix):**

| Domain | expected | got (control=treatment) |
|--------|----------|-------------------------|
| vecteezy.com | affiliate | unknown / **blocked** |
| nordicnest.se | affiliate | affiliate / ok |
| designbyamor.com | affiliate | affiliate / ok |
| design-bestseller.de | affiliate | affiliate / ok |
| madeindesign.com | partner_trade | unknown / **blocked** |
| williamwoodmirrors.co.uk | partner_trade | partner_trade / ok |
| ozdesignfurniture.com.au | partner_trade | partner_trade / ok |
| namly.dk | none | none / ok |
| finnishdesignshop.com | none | unknown / **blocked** |
| thorvalddesign.com | none | **missing from cohort** |
| mohd.it | none | **partner_trade** / ok (FP vs golden none) |
| pazzodesign.it | none | **missing from cohort** |
| flinders.nl | unknown | unknown / blocked (OK) |

Acceptance: **FAIL** — golden match 7/11 present (of 13); affiliate-high **3/4** (vecteezy blocked). Exit 1.

Other golden-adjacent artifacts:

| Artifact | Status |
|----------|--------|
| Unit golden (`npm test` / fixtures) | Code present; live run is ev-golden’s job |
| Extension live export | Deferred — `test-260826-extension-golden-manual.md` PARTIAL PASS |
| Historical CLI pilots | Reports only: `live-verify-260810-design-pilot-200.md` (6/13), `…-200c.md` (6/13), `…-200d.md` (7/13). **Job dirs gone** |
| Track S metrics golden note | Matches this verify output; non-blocking under DIRECTIONAL banner |

Golden lane is separable from throughput gate (phase-04 + brainstorm-260827). Do not treat A/B PASS as golden PASS.

### 5. 10k shard recoverability — **NOT recoverable here**

Expected layout (scripts + last ops):

- Source: `out/design-full-10k/` (`companies.json`, `results.jsonl`, merged CSV/JSON)
- Shards: `out/design-full-10k-shards/shard-{0,1,2}/` + `shard-manifest.json`
- Merge: `npm run shard:merge -- --manifest out/design-full-10k-shards/shard-manifest.json`
- Monitor log: `plans/reports/shard-monitor-live.log` (gitignored `*.log`)
- State: `plans/reports/shard-monitor-state.json` — **absent**
- Profiles: `~/.cache/affiliate-partner-finder/chrome-profile-shard` — **absent**

**Exists now:** none of the job dirs, no manifest, no shard JSONL, no trash copies under `~/.local/share/Trash/files`, no worktrees, no running shard PIDs.

**Last on-disk evidence** (`plans/reports/shard-monitor-live.log`, 526 567 B, mtime 2026-08-14 08:18:42 +07), last tick:

```
shard-0: 1888/2245
shard-1: 1880/2205
shard-2: 1886/2327
TOTAL≈6342/7465 (85.0%)
```

Monitor script hardcodes `BASE_DONE=688`, `TARGET=7465`. Merge was rewriting `out/design-full-10k/results.{full.csv,json,merged.jsonl}` every 120s until that tick. Job then vanishes from this tree (not in git because `out/`).

`scripts/merge-shards.ts` **cannot** reconstruct without `companies.json` + at least one `results.jsonl`. Resume path `shard:relaunch --manifest …` **cannot** run without the manifest and shard dirs.

Scripts still present (code recoverability, not data): `scripts/shard-scan.mjs`, `shard-relaunch.mjs`, `shard-watch.mjs`, `merge-shards.ts`, `shard-monitor-loop.sh`. Track S/A guards still refuse to touch `*design-full-10k*`.

Historical mentions of live 10k (reports only, not data): ops-0918 (~1024/1013/1021 per shard after relaunch), Track A network metrics (~4243/7465 at 2026-08-13 10:30), advise-1005 (~4114/7465). Latest local number is the 6342 log line.

### 6. `plans/reports/` data-bearing vs narrative

**Machine data (keep):**

- `track-s-benchmark-cohort-200.json`, `track-s-micro-cohort.json`
- `track-a-ab-sample-companies.json`, `track-a-none-ok-sample-domains.txt`
- `shard-monitor-live.log` (local only; gitignored)
- `metrics-track-s-ab.md`, `metrics-track-s-trial.md`, `metrics-track-s-baseline.md`
- `metrics-260813-track-a-ab-network.md` (n=40 directional; **job dirs gone**)
- `metrics-260826-track-a-ab-deferred.md` (preflight FAIL: 10k merge missing — already true on 2026-08-26)

**This eval folder:** `plans/reports/orchestrate-260827-apf-eval/` currently `jobs.yaml`, `state.json`, `report.md`, `dispatch.log` (+ this file).

**Missing historical `out/` called by reports:**

`design-full-10k`, `design-full-10k-shards`, `design-pilot-200`, `design-pilot-200c`, `design-pilot-200d`, `track-a-ab-control`, `track-a-ab-network` / `track-a-ab-treatment`.

Track A A/B is **metrics-only**; cannot re-diff networkHits without those dirs.

## Relevant Files

- `out/track-s-ab-control/` / `out/track-s-ab-treatment/` — current directional gate exports
- `plans/reports/track-s-benchmark-cohort-200.json` — n=61 manifest
- `plans/reports/metrics-track-s-ab.md` — GATE line
- `scripts/track-s-ab.sh` / `scripts/build-track-s-cohort.mjs` / `scripts/finalize-track-s-ab.mjs`
- `test/fixtures/golden.ts` / `test/verify-golden.mjs` / `docs/data/test-results.json` / `docs/07-test-plan.md`
- `scripts/merge-shards.ts` / `scripts/shard-scan.mjs` / `scripts/shard-relaunch.mjs`
- `plans/reports/shard-monitor-live.log` — last 10k progress
- `plans/260826-1909-cli-throughput-track-s/phase-04-ab-gate-cohort-200.md`
- `plans/reports/ops-260813-0918-10k-resume-desktop-wire.md`

## Recommendations

1. **Treat 10k scan data as lost** unless an external disk/backup has `out/design-full-10k*`. Do not claim 85% complete as current. Re-collect is a new job (`--query design --limit 10000`) plus shard split.
2. **n=200 production gate:** re-collect Trustpilot `design` limit 200 into a durable path (or restore `design-pilot-200/companies.json`). Do not use `out/track-s-smoke/` pads. Add `thorvalddesign.com` and `pazzodesign.it` to `build-track-s-cohort.mjs`.
3. **Keep DIRECTIONAL banner** on any claim from the 61-row A/B. Throughput evidence is on disk; golden is a separate fail.
4. **Copy or un-ignore** any future 10k `shard-manifest.json` + per-shard `results.jsonl` + source `companies.json` into a non-gitignored archive. Current policy (`out/` + `*.log`) guarantees this failure mode.
5. Golden failures (vecteezy CF, mohd.it none→partner_trade) belong to the golden/detector lane, not a probe-parallel rerun.

## Unresolved Questions

- Is `out/design-full-10k` on another machine, volume, or older checkout? Not in Downloads, cache, tmp, or Trash on this host.
- Should `out/track-s-smoke/` padded 200 be deleted so it cannot be mistaken for pilot-200?
- Stakeholder accept directional n=61 GATE, or block until a real 200-row collect exists?
- Extension live golden export still unset; no exported JSON in-tree for `verify-golden.mjs` besides Track S A/B.
