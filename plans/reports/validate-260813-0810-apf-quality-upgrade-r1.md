# Validate Report: APF quality-upgrade feasibility (r1)

**Timestamp:** 2026-08-13 08:13 +07  
**Role:** VALIDATE (read + report only — no product code changes, no commit, no scan kill)  
**Input:** `plans/reports/research-260813-0802-ai-crawl-quality-upgrade.md`  
**Stack cited:** `lib/detector.ts`, `lib/path-probe.ts`, `lib/classify.ts`, `lib/types.ts`, `lib/config.ts`, `cli/scan.ts`, `cli/browser.ts`, `lib/scan.ts`

## Verdict (one line)

Research direction **A+B is plan-ready** for false-`none` / platform-miss lift; claiming **unknown↓** from network/MO alone is **not supported by live data** — all current `unknown` are load failures.

## 1. Live evidence (verified)

### Scan / monitor procs (alive — not touched)

| Component | State |
|-----------|--------|
| Shard workers | 3× `npm run scan --resume` → `cli/index.ts` on `out/design-full-10k-shards/shard-{0,1,2}` (~15.8h elapsed) |
| Flags | `--scan-profile --virtual-display --concurrency 3 --delay-ms 1000 --accept-failures --early-exit` |
| Monitor | `scripts/shard-monitor-loop.sh` PID 450316 → `plans/reports/shard-monitor-live.log` (tick 120s) |
| Monitor state | `plans/reports/shard-monitor-state.json` → `total: 3655` |

### Progress

| Metric | Value |
|--------|-------|
| Target | **7465** (`shard-manifest.json` `totalCompanies`) |
| Merged done | **3655** (`out/design-full-10k/results.merged.jsonl` / `.full.csv`) ≈ **49.0%** |
| Seed check | Seed TOTAL≈3654 — **match** (live +1 during validate) |
| Per-shard jsonl | 993 / 986 / 991 (partial; merge = shards + prior `completedInSource`) |

### Verdict mix — seed **PASS**

Source: `out/design-full-10k/results.full.csv` + `results.merged.jsonl` (n=3655 at snapshot; seed at 3654 identical %).

| Verdict | Count | % | Seed |
|---------|------:|--:|------|
| `none` | 1736 | **47.5%** | 47.5% ✓ |
| `unknown` | 1145 | **31.3%** | 31.3% ✓ |
| `partner_trade` | 613–614 | **16.8%** | 16.8% ✓ |
| `affiliate` | 160 | **4.4%** | 4.4% ✓ |

Simple CSV (`ket_qua`): `false` 47.5% / `unknown` 31.3% / `true` 21.2% (= affiliate+partner_trade).

### Critical composition (research correction)

| Slice | n | Implication |
|-------|--:|-------------|
| `unknown` × `blocked` | 588 | CF / challenge / thin-DOM heuristic (`lib/detector.ts` anchors&lt;5 / title phrases) |
| `unknown` × `timeout` | 530 | `goto` / budget / incomplete probe → `classify` row 1 |
| `unknown` × `error` | 27 | inject/scan failure |
| `unknown` × `ok` | **0** | **No** “loaded but unsure” bucket today |
| `none` × `ok` | **1736** | Primary addressable FN surface for network + MO |
| Affiliates with `platformHits` | **12 / 160** | DOM host match almost unused; network layer has room |

`lib/classify.ts`: `loadStatus !== 'ok'` ⇒ always `unknown`/`blocked`. Therefore **unknown% is a load/CF problem**, not a missing-affiliate-evidence problem on successful loads.

## 2. Proposal feasibility

### Pass/Fail summary (đủ rõ để vào `ak:plan`?)

| # | Proposal | Feasible in TS stack? | Effort | Risk | Plan gate | Pass/Fail |
|---|----------|----------------------|--------|------|-----------|-----------|
| A | Network evidence (`page.on` + host table) | **Yes** (CLI); extension harder | **M** | Med (FP hosts, schema) | Scope CLI-first + FN metrics | **PASS** |
| B | MutationObserver + scroll settle | **Yes** (inject / settle) | **S** | Low–Med (budget) | Flag + golden A/B | **PASS** |
| C | LLM on `unknown` fallback | Partially; **gate wrong** vs live data | **L** | High (cost, repro, ethics) | Needs re-scope + product yes | **FAIL** |
| D | `blockRequests` (Crawlee-style) | **Yes** (Playwright `route`) | **S** | Med–High (breaks pixels/SPA; fights A) | Throughput-only, after A, flag | **PASS*** |

\*PASS only as **optional throughput experiment**, not as quality primary.

---

### A. Network evidence layer

**Feasible?** Yes in current Playwright CLI path.

- Hook point: `cli/scan.ts` `scanOnPage` — attach `page.on('request'|'response')` **before** `page.goto`, collect third-party hosts, match against `AFFILIATE_PLATFORMS` (`lib/config.ts` L47–71) using same host-boundary rules as `lib/detector.ts` `isPlatformHost` (L58–74).
- Merge: extend `Evidence` / `ClassifyInput` (`lib/types.ts`) with e.g. `networkHits` / fold into `platformHits`; `classify` row 2 already treats `platformHits` as affiliate/high.
- **Not** in `path-probe.ts` (same-origin fetch only) — orthogonal layer.
- Extension `lib/scan.ts`: no Playwright; would need `chrome.webRequest` / debugger — **parity gap**; plan must say CLI-first or dual.

**Effort:** M (types + classify tests + CLI listener + host CDN aliases like `dwin1.com` / Impact track hosts).  
**Risk:** Med — cookie/consent/analytics hosts FP; must keep evidence URL + method=`network`; bump `detectorVersion`.  
**Measurable metrics:**

- `% platformHits` among `loadStatus=ok` (baseline ≈ 12/2509 ≈ 0.5%)
- `none → affiliate` lift on labeled sample of current `none`
- `affiliate%` on `ok` subset (not raw unknown%)
- False-positive rate on golden (`test/fixtures/golden.ts`, 13 cases) = 0 new affiliate on known-none

**Plan clarity:** **PASS** — with explicit goal = **FN / platform recall**, not unknown↓.

---

### B. MutationObserver / lazy settle

**Feasible?** Yes.

- Today: CLI `settle(page, 1200)` = `waitForTimeout` only (`cli/browser.ts` L162–164); extension `sleep(700)` (`lib/scan.ts` L69–70); then one-shot `runDetector` DOM snapshot (`lib/detector.ts` L37–45).
- Port pattern: short scroll + `MutationObserver` window collecting late `<a>` **before** `evaluateInjectable(runDetector)`, or inject observer into detector settle phase (keep self-containment rule).

**Effort:** S.  
**Risk:** Low–Med — eats `DEFAULT_SCAN_BUDGET_MS` (120s); weak signal if widgets need interaction beyond scroll.  
**Metrics:** Δ`totalLinks` / Δ`linkHits` on re-scan of `none` with `totalLinks<20` (149 / 1736 ≈ 8.6%); golden verdict stability.

**Plan clarity:** **PASS** — ship behind flag; A/B after A or in parallel.

---

### C. LLM-unknown fallback (HyperAgent-style)

**Feasible in stack?** Technically yes (TS HTTP client), but **research gate mismatches product + live data**.

- Live: every `unknown` has `confidence: blocked` and non-ok load — LLM on CF/timeout HTML is low value and ethics-sensitive.
- Product roadmap (`docs/10-roadmap-and-ai-extension.md`): AI for **semantic affiliate vs B2B** on collected evidence, **not** for inventing load success.
- Correct optional gate (if ever): `--llm-disambiguate` on **`partner_trade` low** or contested `none` with rich text — still cost-gated; default off.

**Effort:** L (API/provider, schema, desktop secrets, reproducibility, CSV provenance).  
**Risk:** High — cost on ~30% if wrongly gated to unknown; non-deterministic CSV; vendor lock.  
**Metrics (only if re-scoped):** precision/recall on labeled partner_trade↔affiliate; $/1k calls; % rows with `method=llm`.

**Plan clarity:** **FAIL** for entering `ak:plan` as stated (“unknown + low confidence”). Hold until A+B measured + product accepts LLM dependency. Align with research’s own “Hold LLM until A+B”.

---

### D. `blockRequests` (images/fonts)

**Feasible?** Yes via Playwright `page.route` in `cli/scan.ts` only.

**Conflict:** Blocking trackers/images can **remove the network affiliate pixels** proposal A wants to observe. Also may break SPA footer widgets that MO (B) needs.

**Effort:** S.  
**Risk:** Med–High for **quality**; Low for pure throughput if carefully allowlisted.  
**Metrics:** companies/h; affiliate/partner recall vs control on same N; zero ethics change (not stealth/CAPTCHA).

**Plan clarity:** **PASS*** as deferred throughput flag **after** A baseline, with kill switch if recall drops. Not part of quality MVP.

## 3. Acceptance metrics (proposed for plan)

Baseline freeze (this validate): n≈3655, rates in §1.

| ID | Metric | Baseline | Target (A+B cook) | How measured |
|----|--------|----------|-------------------|--------------|
| M1 | `unknown%` overall | 31.3% | **Do not** use as primary success for A/B | merge CSV |
| M2 | `unknown` that are load≠ok | 100% of unknown | Track separately (CF/HITL track) | loadStatus crosstab |
| M3 | `affiliate%` among `loadStatus=ok` | 160/2509 ≈ **6.4%** | +absolute ≥1.0 pp on same cohort re-scan | A/B flag |
| M4 | `none%` among `ok` | 1736/2509 ≈ **69.2%** | ↓ without golden regression | A/B |
| M5 | Rows with non-empty `platformHits` | 12 | ≥5× on re-scan sample | evidence |
| M6 | Golden classify suite | green | stay green | `npm test` + golden |
| M7 | Throughput (companies/h @ 3×3) | ~30–120 noisy / monitor | no worse than −10% with B settle | shard-monitor |
| M8 | LLM (if ever) | n/a | only after M3–M5; gated &lt;5% of ok rows | cost log |

**Definition of done for quality MVP (A then B):** M3+M5 up, M6 green, M7 within budget; **not** M1.

## 4. Gaps before `ak:plan`

1. **Metric narrative fix** — plan must separate **load/unknown track** vs **FN/none track**; research over-promises unknown↓ from A/B.
2. **Labeled FN sample** — no live-labeled subset of the 1736 `none`; need 30–50 HITL labels (or expand golden beyond 13 unit fixtures) before claiming lift.
3. **Host/CDN table** — `AFFILIATE_PLATFORMS` is brand tokens; TagScope-style needs redirect/CDN aliases (Impact/Awin track hosts) — list TBD in plan.
4. **CLI vs extension parity** — network listener is Playwright-native; `lib/scan.ts` gap must be explicit non-goal or phase-2.
5. **Evidence schema** — `method` in export exists in full CSV; jsonl `evidence` has no `networkHits` yet — version bump policy.
6. **LLM product decision** — API in desktop? Local only? Default deny — unresolved in research appendix B.
7. **A vs D interaction** — plan order: A → B → optional D; never enable broad blockRequests with network matching.
8. **Unknown/CF track** (out of research MVP but dominates 31.3%) — retry/HITL already in roadmap v1.1; don’t bury inside network plan.

## 5. Handoff recommendation

- **Enter `ak:plan` for:** Network evidence (CLI) + lazy MO settle; flags; classify/types; golden + FN sample protocol; acceptance = M3/M5/M6/M7.
- **Do not plan yet:** LLM-unknown as specified; full Crawl4AI/browser-use; Firecrawl core.
- **Optional later:** `blockRequests` throughput A/B; Xia TagScope `--compare` for host table only.

## STATUS: DONE_WITH_CONCERNS

Concerns: (1) research success criterion “unknown↓” invalid for A/B given live crosstab; (2) LLM proposal not plan-ready; (3) no labeled FN golden for quantitative lift yet — plan must include measurement design, not only implementation.
