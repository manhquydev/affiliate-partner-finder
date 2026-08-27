---
type: research
date: 2026-08-27
scope: affiliate-partner-finder — shipped vs gaps; Track S directional PASS implications
sources:
  - plans/reports/brainstorm-260826-0909-project-status-next-scope.md
  - plans/reports/brainstorm-260827-track-s-status.md
  - plans/reports/metrics-track-s-ab.md
  - live git HEAD 8e50bed + working tree 2026-08-27
  - plans/260826-0909-next-deployment-scope/plan.md
  - plans/260826-1909-cli-throughput-track-s/plan.md
  - plans/reports/{audit-260826-plan-completion,metrics-260826-track-a-ab-deferred,decision-260826-track-b-deferred,test-260826-win-smoke-110,code-review-track-s-phase5,test-track-s-phase5,research-260827-track-s-probe-algorithm}.md
output_for: plans/reports/orchestrate-260827-apf-eval
---

# Research Report: Project status (shipped vs gaps) + Track S PASS

**Timestamp:** 2026-08-27  
**Repo:** `affiliate-partner-finder` @ `main` `8e50bed` (origin/main in sync)  
**Customer binary:** GitHub Release **v1.0.10** (Latest, 2026-08-26) — NSIS ~91 MB  
**Working tree:** Track S CLI+desktop **uncommitted** (not in the customer binary)

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Methodology](#2-methodology)
3. [Stale claims to drop](#3-stale-claims-to-drop)
4. [Shipped vs gaps matrix (2026-08-27)](#4-shipped-vs-gaps-matrix-2026-08-27)
5. [PRODUCT alignment](#5-product-alignment)
6. [Track S directional PASS — implications](#6-track-s-directional-pass--implications)
7. [Blockers](#7-blockers)
8. [Recommended sequence](#8-recommended-sequence)
9. [False claims](#9-false-claims)
10. [Unresolved questions](#10-unresolved-questions)

---

## 1. Executive summary

**260826 brainstorm is stale.** Wave 1 desktop 1.0.10 **did ship**: selected-job CSV/folder IPC, browse-while-scan, version bump, tag `v1.0.10`, GitHub Release Latest. Wave 2 plan hygiene closed. Track A A/B and Track B **written-defer**, not “still uncommitted UI.”

**Customer path is complete enough to use.** Remaining customer risks: unsigned SmartScreen; Win smoke HITL **waived** (delegated CI+e2e proxy, `test-260826-win-smoke-110.md` `pass-delegated-automated`); quality flags still default OFF and **unmeasured**.

**Track S is a separate unreleased lane.** `--probe-parallel` + isolation fix + desktop checkbox exist in the **working tree**. Metrics file ends `GATE: PASS (directional-throughput)` on **n=61**, **37.6%** wall-clock, **0 true→false**, ethics PASS. Golden FP=0 **FAIL** (non-blocking on directional). This **unlocks Phase 5 land as opt-in default OFF**. It does **not** unlock production throughput claim, default ON, n=200 gate, or “quality upgrade measured.”

**Largest honest gaps now:** (1) Track S uncommitted vs v1.0.10 binary, (2) Track A lift unmeasured, (3) Track B access-unknown unmeasured on fresh data, (4) golden/CF lane (vecteezy / mohd.it) orthogonal to probe-parallel.

---

## 2. Methodology

- **Sources:** 3 named status docs + live git/release + owning plans + 2026-08-26/27 reports listed in frontmatter.
- **Date range:** 2026-08-13 baseline metrics → 2026-08-27 Track S Phase 5 reviews.
- **Rule:** 260826 matrix is the baseline; 260827 + HEAD overwrite it. No live scan re-run this research.
- **Search terms (internal):** `1.0.10`, `GATE: PASS`, `probe-parallel`, `probeParallel`, Win smoke, Track A/B defer.

---

## 3. Stale claims to drop

| 260826-09:09 claim | 2026-08-27 fact |
|--------------------|-----------------|
| Desktop **1.0.9**; uncommitted 12-file UI/IPC delta | **1.0.10 merged** (`5de372e` lineage); tag+Release exist |
| “Desktop hoàn hảo trên main? No — IPC in working tree” | **IPC on main and in customer NSIS** |
| Plan `260812` stale in-progress | **completed** (note: delivered v1.0.10, PR #7) |
| Track A plan pending frontmatter | **completed (code-only)**; A/B deferred |
| Audit: no `v1.0.10` tag; Latest = 1.0.9 | **Latest = v1.0.10** (`gh release list`) |
| Unit 152 / e2e 9 | Phase 5 tester: **174 unit**, **10 e2e pass / 1 skip** (WT) |
| Customers still on 1.0.9 | **Customers can download 1.0.10** |

Do not plan “ship 1.0.10 polish” again. That wave is done except residual HITL risk.

---

## 4. Shipped vs gaps matrix (2026-08-27)

Partition reused from 260826 / red-team. Badge = evidence now, not intent.

### A. Shipped & verified (on `main` / customer Release)

| # | Item | Badge | Evidence |
|---|------|-------|----------|
| A1 | Detector 3-layer + deterministic classify | **VERIFIED** | `lib/detector.ts`, `classify.ts`; 30 classify tests |
| A2 | Ethics: blocked ≠ none | **VERIFIED** | classify tests; PRODUCT principles |
| A3 | CLI collect/scan/resume/CSV | **VERIFIED** | `cli/`; plan 260810-1610 complete |
| A4 | `--scan-profile`, closeQuietly, virtual-display | **VERIFIED** | 1.0.5–1.0.7 |
| A5 | Collect 10k: WAF retry, max-pages, progress | **VERIFIED** | 1.0.8 |
| A6 | Desktop Electron + supervisor | **VERIFIED** | 1.0.9 workspace |
| A7 | Job workspace (table + preview) | **VERIFIED** | 1.0.9 |
| A8 | Windows Start (no Linux vd leak) | **VERIFIED** | 1.0.6 |
| A9 | Track A flags network-evidence / lazy-settle **default OFF** | **CODE VERIFIED** | PR #1 lineage; flags still OFF |
| A10 | Rolling ETA, stall hide >8m | **VERIFIED** | PR #2 |
| A11 | Extension MV3 pipeline | **VERIFIED** | v1 phases 1–4; `wxt build` |
| A12 | Golden verify tooling | **VERIFIED** | `test/verify-golden.mjs` |
| A13 | **1.0.10 selected-job CSV/folder + browse-while-scan** | **VERIFIED** | PR #7; `docs/desktop-windows.md`; Release v1.0.10 |
| A14 | CI on push/PR + Desktop Pack Preview | **VERIFIED** | `1d29f16`; docs §CI table |
| A15 | Release smoke-gate scripts | **VERIFIED** | `release-v1.0.10-gate.sh`; HITL later waived |

**A count: 15** (was 12). A9 code ≠ measured lift (see B1).

### B. Shipped code, unmeasured / partial / process debt

| # | Item | Badge | Gap |
|---|------|-------|-----|
| B1 | Network-evidence recall on live sites | **UNMEASURED** | Sample 40 < 50; no `out/design-full-10k/` on this machine. Defer: `metrics-260826-track-a-ab-deferred.md`. Keep default OFF. |
| B2 | Lazy-settle recall/latency | **UNMEASURED** | Same Track A gate. |
| B3 | Extension v1 **live** golden | **PARTIAL** | Phase-02: unit/build PASS; live export deferred. |
| B4 | Track A plan 260813-0816 | **CODE CLOSED / MEASUREMENT OPEN** | Frontmatter `completed`; phase-04 DONE_PARTIAL. |
| B5 | ~31% unknown = access failure | **STALE STAT** | 2026-08-13 n≈3659. No fresh merge CSV. Track B decision: do not code until ≥500-row window after 1.0.10 ops. |
| B6 | Win smoke HITL (Start→Stop→Resume→Mở CSV on **selected** job) | **WAIVED** | Sign-off PASS via CI+preview+e2e. Physical VM steps **not** run. Residual customer risk. |
| B7 | `npm run compile` | **DEBT** | Track S notes ~35 tsc errors (compare types + desktop e2e types). Vitest not blocked. |
| B8 | DESIGN Linear×Explorer canon | **PARTIAL** | 1.0.10 landed visual delta; not a release blocker. |

**B count: 8.**

### C. In working tree — not on origin/main, not in v1.0.10 binary

| # | Item | Badge | Evidence |
|---|------|-------|----------|
| C1 | `--probe-parallel` CLI (default OFF, batch≤3) | **WT READY** | `cli/index.ts`, `lib/path-probe.ts`, `lib/probe-batch.ts` uncommitted |
| C2 | Profile isolation (`newPage` per company; no keepAlive steal) | **WT READY** | Phase 5 CR: prior 16/61 cross-domain **cleared in source** |
| C3 | Desktop checkbox **Quét đường dẫn song song** | **WT READY** | `#probeParallel` unchecked; argv omit unless true; CR+tester PASS |
| C4 | Track S A/B metrics + scripts | **WT ARTIFACT** | `metrics-track-s-ab.md` untracked; `GATE: PASS (directional-throughput)` |
| C5 | Isolation **regression test** | **MISSING** | CR Important nit: zero test that `openPage` ≠ keepAlive |
| C6 | `docs/desktop-windows.md` checkbox list | **MISSING** | §4 still “Dừng sớm / Kiểm tra mạng / Chờ tải linh hoạt” only |
| C7 | Phase-05 plan checkbox / status drift | **DOC DRIFT** | `plan.md` phase 5 `in-progress`; `phase-05` frontmatter still `pending`; code+reviews say landable |
| C8 | `design-full-10k` live job | **ABSENT HERE** | No merge artefact in workspace |

**C count: 8.** Customer 1.0.10 **does not** include C1–C3.

### D. Locked / explicit defer

| # | Item | Authority |
|---|------|-----------|
| D1 | Track B timeout/retry **product code** | `decision-260826-track-b-deferred.md` |
| D2 | Extension network / lazy / probe-parallel parity | Plan non-goal |
| D3 | LLM extract | docs/10 v2; unknown empty = wrong gate |
| D4 | English i18n | PRODUCT undecided |
| D5 | Code signing | PRODUCT undecided; SmartScreen documented |
| D6 | In-app results browser | PRODUCT out of rebuild |
| D7 | `--probe-parallel` **default ON** | Track S non-goal; PRODUCT scan options list still Track A flags only |
| D8 | New path-probe algorithm | `research-260827-track-s-probe-algorithm.md`: **not needed** |
| D9 | n=200 **production** throughput claim | Metrics header: DIRECTIONAL n<200 |
| D10 | Stop-on-hit / concurrency >3 / CF bypass | Ethics + red-team |

**D count: 10.**

### E. Rejected (unchanged)

Stealth/bypass; unknown%↓ as Track A or Track S KPI; big-bang A+B; Firecrawl-as-core; full Xia ports.

---

## 5. PRODUCT alignment

| PRODUCT requirement | Status 2026-08-27 |
|---------------------|-------------------|
| Trustpilot keyword + limit 1–10000 | ✅ CLI + desktop 1.0.10 |
| Job pick/new/resume | ✅ |
| Scan options; quality flags default OFF | ✅ Track A. Probe-parallel **WT only**, also default OFF |
| Start/Resume/Stop + SIGINT CSV | ✅ |
| Live dashboard / stall ETA | ✅ |
| Cloudflare panel, no bypass | ✅ (no live e2e) |
| Open CSV + folder = **selected** job | ✅ 1.0.10 (was 1.0.9 supervisor-only) |
| Vietnamese UI | ✅ |
| Job workspace not stacked form | ✅ 1.0.9+ |
| Select other job while scan runs | ✅ 1.0.10 |
| One scan at a time | ✅ |
| No in-app results table | ✅ out of scope |

**Conclusion:** Original PRODUCT operating-context gap that 260826 called Wave 1 **is closed on the released binary.** Remaining PRODUCT drift: checkbox not in customer docs; probe-parallel not in “must remain” list (correct until Track S lands).

---

## 6. Track S directional PASS — implications

### 6.1 What the gate actually says

From `plans/reports/metrics-track-s-ab.md` (2026-08-27T02:14Z):

| Signal | Value |
|--------|-------|
| Cohort | **n=61 paired** (not 200) |
| Control wall | 1098s |
| Treatment `--probe-parallel` | 685s |
| Speedup | **37.6%** (bar ≥25%) |
| Throughput ≥25% | PASS |
| Golden FP=0 (treatment) | **FAIL** (non-blocking directional) |
| none@ok FN (no new path evidence) | PASS |
| blocked→none ethics | PASS |
| true→false regression | PASS (0) |
| cross-domain finalUrl | PASS (post isolation fix) |
| Both arms complete | PASS |
| **GATE** | **`PASS (directional-throughput)`** |

Paired verdict diffs: **4**, none true→false:

| domain | control | treatment |
|--------|---------|-----------|
| 99designs.com | true (affiliate) | unknown |
| designkoti.com | unknown | false (none) |
| designpple.com | false (none) | unknown |
| learn.thedesignforchange.com | false (none) | unknown |

Golden mismatches called out: vecteezy / madeindesign / finnishdesignshop **blocked**; mohd.it **none→partner_trade** (detector, not probe); two rows missing.

`scripts/finalize-track-s-ab.mjs` emits this GATE label when `directional` + throughput checks pass; golden is **non-blocking** iff n<200.

### 6.2 Bugs already paid for (do not relitigate)

1. `remainingScanBudgetMs` undefined → false timeout  
2. keepAlive tab share @ concurrency 2 → 16/61 cross-domain — **fixed** (`context.newPage()` + always `closeQuietly`)  
3. finalize ethics paired vs same-row → false FAIL(11)  
4. `goto` load hang xvfb → `domcontentloaded`

Phase 5 CR (2026-08-27): isolation contract **PASS in source**. Recurrence would poison **every desktop job** (always `--scan-profile`, default concurrency 2/3). Highest remaining nit = **no regression test**.

### 6.3 What PASS unlocks

| Unlocks | Why |
|---------|-----|
| Phase 5 desktop mirror **may land** | Hard gate is `grep -q 'GATE: PASS'` — string present |
| Ship algorithm as **opt-in default OFF** | 37.6% vs 25% bar; 0 true→false; ethics hold |
| Skip new probe algorithm | Research 260827: batch-3 + junk sequential-first is enough; adaptive/early-abort only if n=200 speedup <25% **after** isolation |

Phase 5 already implemented in WT: HTML unchecked, Vietnamese **Quét đường dẫn song song**, IPC/argv omit unless checked. Tester: 174/174 unit, 22/22 track-s, 10 e2e pass / 1 skip.

### 6.4 What PASS does **not** unlock

| Does not unlock | Why |
|-----------------|-----|
| Production throughput claim | Header: `DIRECTIONAL — cohort n<200` |
| Default ON | Explicit non-goal; PRODUCT defaults unchanged |
| n=200 / `design-pilot-200` recover | Ops; cohort was 61 |
| Golden FP=0 as quality ship gate | FAIL; CF/blocked + mohd.it detector |
| Track B access code | Orthogonal KPI; blocked goldens are Track B / profile-warm |
| Track A network-evidence default | Different flag, still unmeasured |
| Customer 1.0.10 binary | Already tagged **without** Track S |
| `npm run compile` green | Unrelated type debt |

### 6.5 Golden vs throughput — keep lanes split

| Failure | Lane | Action |
|---------|------|--------|
| vecteezy, madeindesign, finnishdesignshop blocked | Golden / Track B | Profile warm; not a probe-parallel rollback |
| mohd.it none→partner_trade | Detector Track A v1.1 soft-case | Not throughput |
| Missing thorvalddesign / pazzodesign | Cohort completeness | Ops hygiene |
| 99designs true→unknown | Quality watch | Not true→false; do not treat as regression FAIL |

**Do not** fail Track S land because golden 7/11. **Do not** claim golden PASS because throughput PASS.

### 6.6 Plan success-criteria honesty

Track S `plan.md` still has unchecked:

- A/B throughput ≥25%; **golden FP=0**; none@ok FN=0  
- Desktop only after GATE PASS file  

Directional GATE **satisfies the Phase 5 grep**, **fails the original golden-FP=0 success bar**. Brainstorm 260827 already reframed acceptance to `GATE: PASS (directional-throughput)`. Stakeholder must accept that split or wait for n=200 + golden lane.

---

## 7. Blockers

Ordered by what they actually block.

| Pri | Blocker | Blocks | Unblock |
|-----|---------|--------|---------|
| **P0** | Track S still **uncommitted** | Customer never sees 37.6% opt-in; isolation fix not in 1.0.10 binary | Land WT after docs nit + optional isolation test; **do not** retag 1.0.10 without product decision |
| **P0-decision** | Accept directional PASS vs wait n=200 | Whether Phase 5 may merge | Kongming/brainstorm recommends **accept directional**, golden parallel |
| **P1** | Golden/CF + mohd.it | Production quality bar, not throughput | Separate golden track; profile warm; detector soft-case |
| **P1** | Isolation regression test absent | Silent return of tab-steal on desktop | One test: `openPage` distinct / no profile skip-close |
| **P1** | `docs/desktop-windows.md` omits new checkbox | Customer docs vs WT UI | Add to default-off list **in same land as Phase 5** |
| **P2** | Track A sample 40 / no merge CSV | Network-evidence default / marketing | Ops: ≥50 domains + `track-a-ab.sh` |
| **P2** | Track B no fresh ≥500-row window | Timeout-code slug | Measure after 1.0.10 ops; KPI still >20% then new plan |
| **P2** | HITL Win smoke waived | Confidence in 1.0.10 installer UX | Re-run on customer VM **only if** field issues |
| **P3** | `tsc --noEmit` ~35 errors | CI compile script, not vitest | Fix track-s-compare + desktop e2e types |
| **P3** | Extension live golden | Extension v1 closeout | Manual `design` export + verify-golden |
| **—** | New probe algorithm | Nothing | **Not a blocker** |

**Not blockers:** 1.0.10 IPC (shipped); Track A/B **code** for desktop release (deferred on purpose); LLM; English; signing.

---

## 8. Recommended sequence

Matches 260827 brainstorm + 260826 north star (customer desktop first), updated for Release already existing.

1. **Land Track S WT as opt-in 1.0.11 (or unreleased main)** — isolation + `--probe-parallel` + checkbox default OFF + desktop-windows.md bullet. Do **not** mix into a silent 1.0.10 rebuild.  
2. **Optional before merge:** isolation regression test + e2e `#probeParallel` unchecked (CR nits).  
3. **Golden/CF lane parallel** — does not block (2).  
4. **n=200 recover** when `design-pilot-200` available — production GATE, not Phase 5.  
5. **Track A A/B** when merge sample ≥50 — still default OFF until numbers.  
6. **Track B code** only if fresh access-unknown% >20% after runbook.

No new path-probe algorithm in this sequence.

---

## 9. False claims

| Claim | Reality |
|-------|---------|
| “Dự án xong” | Track A unmeasured; Track B unmeasured; Track S unreleased; extension live golden open |
| “Quality upgrade đã ship” | Track A **code** on main; **lift unmeasured** |
| “1.0.10 includes probe-parallel” | **False.** Release is pre-Track-S. Feature is working tree |
| “GATE PASS = production throughput” | Directional n=61 only |
| “GATE PASS = golden PASS” | Golden FP=0 **FAIL** (non-blocking) |
| “Giảm unknown bằng network-evidence / probe-parallel” | unknown = blocked/timeout (Track B). Metric lie |
| “Win smoke HITL proved 1.0.10” | Delegated automated substitute |
| “Need a new probe algorithm” | Contradicted by 37.6% + 0 true→false |

---

## 10. Unresolved questions

1. Stakeholder accept **directional PASS** as Phase 5 merge unlock, or hold for n=200 + golden FP=0? (Brainstorm recommends accept.)  
2. Next desktop version after Track S land: **1.0.11** vs stay 1.0.10 + untagged main? (1.0.10 already released — bump.)  
3. When recover `design-pilot-200` for production gate?  
4. Re-run HITL Win smoke, or treat delegated PASS as closed?  
5. Is `out/design-full-10k` alive on an ops machine not this workspace?

---

## Next steps (actionable)

| Owner | Action |
|-------|--------|
| Eval synthesis (`ev-advise-rd`) | Use this matrix; do not restart Wave 1 1.0.10 |
| Track S cook | Commit isolation + probe-parallel + docs; keep default OFF |
| Golden agent | Separate vecteezy/CF vs mohd.it detector |
| Ops | Cohort 200 + Track A sample + Track B window — not this repo session |

**STATUS: DONE** — matrix updated against live `8e50bed` + WT; Track S PASS scoped as directional-only Phase 5 unlock, not production claim.
