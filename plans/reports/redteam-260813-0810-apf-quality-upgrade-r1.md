# Red-team R1 — APF quality upgrade (AI crawl research → ship decisions)

**Timestamp:** 2026-08-13 08:10–08:15 +07  
**Agent:** RED-TEAM (read + write report only; no product code changes; no commit; scan processes left running)  
**Inputs:** filesystem evidence + `plans/reports/research-260813-0802-ai-crawl-quality-upgrade.md` + `desktop/eta.ts`  
**Primary artefacts:** `out/design-full-10k/results.full.csv`, `out/design-full-10k/progress.json`, `out/design-full-10k-shards/shard-{0,1,2}/progress.json`, `out/design-full-10k-shards/shard-manifest.json`

---

## 1. Project anatomy (what this repo is)

| Surface | Role | Shared core |
|---------|------|-------------|
| **Chrome extension (WXT)** | Interactive Trustpilot collect → site scan in-tab; IndexedDB; HITL-friendly | `lib/detector.ts`, `path-probe.ts`, `classify.ts` |
| **CLI Playwright** | Batch industry scan, resume, `--early-exit`, `--scan-profile`, `--virtual-display` (Xvfb), concurrency clamp **1–3** | same detector/classify |
| **Desktop Electron** | Customer GUI wrapping CLI; progress + rolling ETA (`desktop/eta.ts`) | same CLI argv / artefacts |
| **Shard 10k ops** | Split `design` queue into 3 workers × concurrency 3; monitor/relaunch; merge later | `scripts/shard-*.mjs`, profiles per shard |

**Product job:** deterministic affiliate/partner **verdict + evidence** (`affiliate` / `partner_trade` / `none` / `unknown`), not RAG markdown or NL browser agents.

**Ethics clamp (product policy):** no CAPTCHA/CF bypass; CF = human-in-the-loop on shared Chrome profile; CLI concurrency ≤3; extension 1 tab; no login/submit.

**Scan-in-flight (observed, not touched):** three `npm run scan --resume … design-full-10k-shards/shard-{0,1,2}` under Xvfb, `--concurrency 3 --early-exit --scan-profile --accept-failures`.

---

## 2. Current numbers (verified from filesystem)

### 2.1 Progress / coverage

| Metric | Value | Source |
|--------|------:|--------|
| Queue total (design full) | **7465** | `shard-manifest.json` `totalCompanies`; `out/design-full-10k/progress.json` |
| Completed rows in merged technical CSV | **3655** | `out/design-full-10k/results.full.csv` (DictReader count) |
| Coverage | **3655 / 7465 ≈ 49.0%** | same (seed said ≈3654/7465 ≈49%) |
| Pre-shard completed in source | 688 | manifest `completedInSource` |
| Pending at shard split | 6777 (= 2245+2205+2327) | manifest |
| Shard completed (live progress.json) | 993+986+990 = **2969** / 6777 (43.8% of shard pending) | shard-0/1/2 `progress.json` @ ~01:12Z |
| Monitor counter | `total: 3655` | `plans/reports/shard-monitor-state.json` |
| Stale note | `out/design-full-10k/progress.json` still shows `completed: 688` (split-time); **trust CSV + shard progress + monitor** for live % | filesystem |

Seed check: **TOTAL≈3654/7465 (~49%)** — verified as **3655/7465**; +1 row while shards still writing.

### 2.2 Verdict distribution (merged `results.full.csv`)

| Verdict | Count | % of 3655 | Seed |
|---------|------:|----------:|------|
| `none` | **1736** | **47.5%** | 1736 (47.5%) ✓ |
| `unknown` | **1145** | **31.3%** | 1145 (31.3%) ✓ |
| `partner_trade` | **614** | **16.8%** | 613 (16.8%) — +1 live drift |
| `affiliate` | **160** | **4.4%** | 160 (4.4%) ✓ |
| Positive (`affiliate`+`partner_trade`) | **774** | **21.2%** | — |

### 2.3 What “unknown” actually is (critical)

| `unknown` × `loadStatus` | Count | % of unknown |
|--------------------------|------:|-------------:|
| `blocked` | 588 | 51.4% |
| `timeout` | 530 | 46.3% |
| `error` | 27 | 2.4% |
| **`ok`** | **0** | **0%** |

| Related | Count | Note |
|---------|------:|------|
| `unknown` with empty `evidenceUrl` | 1145/1145 | 100% |
| `unknown` `confidence` | all `blocked` | classify policy: failed open ≠ `none` |
| `loadStatus=ok` rows | 2510 (68.7%) | **never** `unknown` today |
| `none` among `ok` (FN candidate pool) | **1736** | 69.2% of successful loads |
| Detection methods on positives | `link` 669, `path` 93, `platform` **12** | platform/DOM host hits rare |

**Red-team finding:** the 31.3% `unknown` bucket is an **access / timeout / CF-HITL** problem, not a “lazy DOM missed affiliate link on a loaded page” problem. Network host matching + MutationObserver primarily attack **false `none` on `ok` pages**, not the unknown %.

### 2.4 Throughput / ETA context

| Signal | Value | Source / implication |
|--------|------:|----------------------|
| CSV `scannedAt` span | ~33.8 h wall → **~108 companies/h** average | includes restarts / stalls |
| Last 8 h / 4 h / 2 h / 1 h in CSV | ~92 / ~71 / ~47 / **~21**/h | recent rate **cooling** — ETA risk |
| Research cited ops rate | ~150–200/h @ 3×3 workers | aspirational vs current CSV |
| Remaining | 7465−3655 = **3810** | @100/h ≈38 h; @150/h ≈25 h; @200/h ≈19 h |
| Desktop ETA design | blend recent 8m + medium 25m + session; stall if no progress **8 min** | `desktop/eta.ts` `WINDOW_*`, `STALL_MS` |

Any quality feature that adds **per-page settle seconds** or **LLM round-trips** on the hot path will push finish-At and trip “stalled” UX unless gated.

### 2.5 Research recommendations (accepted as intent, challenged on diagnosis)

From `research-260813-0802-ai-crawl-quality-upgrade.md`:

1. **YES:** network-layer affiliate host evidence (TagScope-style listen; **not** full repo port).  
2. **YES:** MutationObserver + short scroll settle for lazy links.  
3. **MAYBE later:** LLM extract only for hard cases; flag off by default.  
4. **NO:** port Crawl4AI / browser-use / Firecrawl-as-core / stealth CAPTCHA stacks.

Red-team agrees with (4) and the **shape** of (1)(2). Challenges the implied KPI “unknown↓” without separating **access-unknown** vs **evidence-unknown**.

---

## 3. Threat model & wrong-way deployment risks

### 3.1 Assumptions (attacker / failure modes)

| Actor / pressure | Goal / failure |
|------------------|----------------|
| Eng team chasing “AI crawl” hype | Transplant Python agent stack → dual runtime, slower 10k, ethics drift |
| Ops chasing unknown% | Apply LLM or stealth to `blocked` rows → cost + ToS risk, still no evidence |
| Product marketing | Treat `none` as “no program” without HITL on positives; overclaim precision |
| Cost pressure | Raise concurrency >3 or disable delays → ban / more CF → **more** unknown |
| ETA pressure | Drop settle/network flags mid-run without A/B → unreproducible CSV mix |

### 3.2 Misdirection matrix

| Proposed move | Intended benefit | Actual effect on **today’s** CSV | ETA impact | Ethics |
|---------------|------------------|-----------------------------------|------------|--------|
| Port Crawl4AI / browser-use | “smarter crawl” | Wrong JTBD; non-deterministic CSV | **Severe slowdown** | Stealth/CAPTCHA features conflict policy |
| LLM on all `unknown` (31%) | unknown↓ | Mostly blocked/timeout — **no usable DOM**; money burned | Slows finish | Low if read-only, but useless |
| Network host listener | catch Impact/Awin pixels | Helps **`none`→affiliate/partner` on `ok`**; little direct unknown↓ unless partial load before block | Near-zero if observe-only (`request`/`response`, not heavy `route`) | OK if observe-only |
| MutationObserver + scroll every page | lazy widgets | Same as network: FN↓ on `ok`; unknown unchanged | **+N seconds/page** → ETA↑ unless capped / early-exit aware |
| Undetected / CF bypass | blocked↓ | Policy violation; ban risk | Short-term maybe; long-term worse | **Forbidden** |
| Raise shard concurrency | faster 10k | More CF/timeout → unknown% may **rise** | Wall-clock maybe↓, quality↓ | Ethics clamp break |

### 3.3 Ethics (hard lines)

- **Do not** automate Cloudflare/CAPTCHA solve.  
- **Do not** ship “stealth” stacks marketed for bot evasion as product core.  
- HITL: human passes challenge once per profile; `--scan-profile` / headed or VNC on virtual display — already documented.  
- Throttle: keep concurrency ≤3 per process; shard×3 already = 9 browsers — further stacking is a red-team concern for CF rate.

### 3.4 LLM cost sketch (illustrative unit $0.002/extract + ~3s)

| Gate | Pages (current CSV) | $ sketch | Serial time sketch | Fit |
|------|--------------------:|---------:|-------------------:|-----|
| All `unknown` | 1145 | ~$2.3 | ~1.0 h | **Bad** — no page |
| All `none@ok` | 1736 | ~$3.5 | ~1.4 h | Expensive; ETA hit if inline |
| 10% sample `none@ok` / low-conf only | ~173 | ~$0.35 | ~0.1 h | Acceptable experiment |
| Full 10k LLM | ~7465 | ~$15+ and **days** of latency if not tiny model | Catastrophic vs Playwright scan | Reject |

Parallel LLM still competes with CPU/RAM against 9 Playwright workers → **ETA regression** even if $ is small.

---

## 4. Ranking — P0 / P1 / P2 / “không làm gì”

| Priority | Item | Why | Target metric | ETA constraint |
|----------|------|-----|---------------|----------------|
| **P0** | **Separate KPIs:** (A) access-unknown% = blocked+timeout+error; (B) evidence-FN risk = `none@ok` (+ optional golden FN). Stop using raw `unknown%` as success for DOM/network ports. | Prevents shipping wrong cure | Dashboard: report both; baseline A=31.3%, B-pool=1736 | None |
| **P0** | **Access path for unknown↓:** HITL CF playbook per shard profile, timeout/retry tuning, ensure cookies on scan path — **without** bypass. | 100% of unknowns are failed loads | Cut access-unknown toward **≤20%** of completed rows on next 1k sample (stretch: ≤15%) | Must not add per-OK-page work; retries only on fail |
| **P1** | **Network host evidence** during `scanOne` (observe requests; method=`network`; merge classify) | `platform` method only 12 hits; research #1; cheap | On `ok` pages: lift positive rate or convert ≥**5–8 pp** of sampled `none@ok`→positive on golden/network-heavy sites; **unknown% change ≈0 expected** | Observe-only; no full `route` cache kill |
| **P1** | **MutationObserver + short settle** behind flag; default short budget (e.g. ≤1–2s) or only when DOM detector empty | Research #2; lazy widgets | Same FN↓ on `ok`; measure **p50 page time Δ ≤ +1.5s** | Abort settle on early-exit hit; disable if ETA stall |
| **P2** | Optional `--llm-unknown` **misnamed** — should be `--llm-none-lowconf` / extract on **ok + inconclusive**, flag default off | Research #3 after A+B measured | Only if gated subset ≤**5–10%** of `ok`; no regression on access-unknown | Offline/async batch preferred vs inline scan |
| **P2** | Selective asset blocking (Crawlee-style) A/B | Throughput idea | Companies/h **≥** baseline on 200-run; no drop in positive recall | Ship only if A/B green |
| **Không làm gì** | Full port Crawl4AI / browser-use / Webwright / Firecrawl-as-core | Research NO; dual runtime; ethics; ETA | — | — |
| **Không làm gì** | LLM on every URL or on all current `unknown` | Burns $ on empty pages; slows ETA | — | — |
| **Không làm gì** | Stealth / CAPTCHA solvers / concurrency >3 (per process) or unbounded shard fan-out | Ethics + likely more blocks | — | — |
| **Không làm gì** | Claim “quality upgrade done” because stars on GitHub AI crawlers | Vanity ≠ affiliate precision | — | — |

---

## 5. TOP 3 — nên triển khai / tích hợp (with metrics)

### TOP 1 — Network host evidence layer (deterministic)

- **What:** `page.on('request'|'response')` collect third-party hosts vs expanded affiliate/CDN table; classify merge with `method=network` + evidence URL/host. Port **idea** from TagScope / ShopBack-style host tables — **not** Python repos.  
- **Why now:** aligns research; near-zero ETA cost; attacks real gap (`platform` = 12).  
- **Metrics:**  
  - Primary: ↑ `affiliate`+`partner_trade` among **`loadStatus=ok`**, or ↓ FN on golden set.  
  - Secondary: raw `unknown%` **unchanged is OK** (do not fail the feature for that).  
  - Guard: p50/p90 scan time per company within **+5%** of baseline.

### TOP 2 — Access-unknown reduction (HITL / timeout / profile) — *required if KPI is unknown%*

- **What:** operational + light engineering: per-shard CF pass, timeout policy, retry only on `blocked`/`timeout`, monitoring when rate &lt; stall threshold (ETA `STALL_MS` 8m). **No bypass.**  
- **Why:** only lever that can move 31.3% unknown given current data.  
- **Metrics:**  
  - `unknown%` on next contiguous **≥500** completed rows → **≤20%** (stretch ≤15%).  
  - `blocked+timeout` share ↓ without raising concurrency.  
  - Aggregate companies/h recover toward **≥120–150/h** (from recent ~21–90/h cooling).

### TOP 3 — Lazy link settle (MutationObserver + bounded scroll), flag-gated

- **What:** short MutationObserver window + minimal scroll **before** detector; skip/limit when early-exit already has strong hit.  
- **Why:** research #2; complements network for widget-injected anchors.  
- **Metrics:**  
  - On A/B 200 `ok` sites: additional true positives ≥ **N** (set N from golden) with **0** new false-affiliate on none-golden.  
  - Mean added latency **≤1.5s/page**; if medium-window ETA rate drops &gt;10%, keep flag default **off**.

**Explicit defer:** LLM fallback until TOP1+TOP2 baselines measured; never as unknown% silver bullet for this CSV.

---

## 6. “Không làm gì” summary (ship blockers)

1. Do **not** port Crawl4AI / browser-use as engine.  
2. Do **not** run LLM across 10k or across today’s `unknown` set.  
3. Do **not** bypass CF/CAPTCHA or raise ethics concurrency clamps to “fix” unknown.  
4. Do **not** sell network/MO as unknown%-fix without the access workstream — that is a **metric lie**.

---

## 7. Concerns / open risks

1. **Live scan cooling** (~21/h last hour in CSV) while 3 shards still listed running — finish date uncertain; desktop stall UX likely if this persists. (Observed only; **not** restarted/killed this round.)  
2. **Progress.json staleness** on `out/design-full-10k/` vs live CSV — ops dashboards must prefer merged CSV / monitor.  
3. Research report’s “unknown↓” framing is **partially misaligned** with evidence; implementers may waste a sprint.  
4. Shard fan-out already = 9 browsers; quality upgrades that add work **per page** amplify ETA pain more than single-process pilots suggest.

---

## 8. Handoff

- Plan/cook: **network evidence** + **bounded lazy settle** + **access-unknown ops KPI split**.  
- Do not start Xia full-repo ports.  
- Re-measure verdict tables on a frozen CSV snapshot before claiming lift.

---

**STATUS: DONE_WITH_CONCERNS**
