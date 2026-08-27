---
type: advise
date: 2026-08-27
scope: affiliate-partner-finder — deployment roadmap after independent eval
inputs:
  - plans/reports/orchestrate-260827-apf-eval/* (all sibling reports)
  - plans/reports/metrics-track-s-ab.md
  - plans/reports/brainstorm-260827-track-s-status.md
  - plans/reports/brainstorm-260826-0909-project-status-next-scope.md
  - plans/reports/brainstorm-260826-ci-and-release-gap.md
  - plans/reports/brainstorm-260826-gap-remediation.md
head: 8e50bed (main == origin/main)
customer_binary: GitHub Release v1.0.10
working_tree: Track S uncommitted
---

# Advise — Deployment roadmap (ship / measure / improve)

**Mode:** Interview self-answered from locked PRODUCT + brainstorm decisions. Eval job asked for a synthesis file, not a live grill.  
**Audience:** next cook / ops. Not a customer doc.

## Understanding (pre-interview)

Customer path is the **desktop window** (`PRODUCT.md`). v1.0.10 already shipped (IPC selected-job, browse-while-scan, CI, pack preview, GitHub Release). Track S `--probe-parallel` sits in the **working tree** with `GATE: PASS (directional-throughput)` on **n=61**, not in the customer binary. Golden live **FAIL**. 10k shards **gone** from this workspace. Track A lift **unmeasured**. Track B access **unmeasured** on fresh data.

The roadmap is **not** “cut 1.0.10 again” and **not** “new probe algorithm”.

## Self-answered interview (locked)

| # | Question | Self-answer (from PRODUCT + 260826/260827 brainstorms) |
|---|----------|--------------------------------------------------------|
| 1 | Why is a roadmap worth writing? | Without it, next work retags 1.0.10, invents a probe algo, or mixes golden FAIL into a throughput rollback. |
| 2 | Strongest objection | “Don’t ship more flags — measure first.” Rebuttal: throughput **was** measured (directional). Land is **opt-in default OFF**. Default-ON still waits n=200. |
| 3 | Load-bearing assumption | n=61 none-heavy mix (40/61 none) is enough to land **opt-in**. Most likely false for **production speed claims**. Stay OFF until n=200. |
| 4 | Alternatives | (A) wait n=200+golden before any land — loses isolation fix in customer binary. (B) land 1.0.11 opt-in now, measure n=200 later. (C) freeze on 1.0.10 forever. **Pick B.** |
| 5 | Constraints | `blocked≠none`; concurrency≤3; probe batch≤3; no CF bypass; no stop-on-hit; Vietnamese-only UI; do not retag 1.0.10. |

## Confirmed reframing

- **Problem:** Customer binary is 1.0.10-complete. Highest-leverage unreleased work is Track S isolation + opt-in probe-parallel. Remaining quality/access/compile work is **other lanes**. Mixing lanes will stall ship or produce false claims.
- **Exact requirements:**
  1. Do not rebuild or retag **v1.0.10**.
  2. Land Track S as **1.0.11** (or unreleased main bump), default **OFF**.
  3. Keep golden / Track A / Track B / compile as **separate** gates.
  4. No production throughput claim until n=200 `GATE: PASS` without directional banner.
  5. Ethics floor unchanged.
- **Goals:** Customer can opt into faster path-probe; isolation fix is in the installer; next measurements have honest labels.
- **Non-goals:** new probe algorithm; default-ON probe-parallel; CF bypass; English i18n; in-app results table; extension parity; LLM; code signing (undecided); pad cohort to 200.
- **Constraints:** as table above. `out/` + `*.log` gitignored — treat scan data as ephemeral unless archived.

## Verified vs believed

**Verified (sibling reports + metrics file):**

| Fact | Source |
|------|--------|
| Release **v1.0.10** exists; WT ≠ that binary | research-project-status, research-deploy-readiness |
| n=61 paired; 1098s → 685s (**37.6%**); 0 true→false; ethics PASS | metrics-track-s-ab.md |
| `GATE: PASS (directional-throughput)` | same |
| Live golden FAIL: affiliate-high 3/4; mohd.it none→partner_trade; 2 goldens missing | golden-gate-status.md |
| Isolation in source: `openPage` → `newPage()`; always `closeQuietly`; A/B JSONL 0 cross-domain | code-review-track-s.md, scout-data-artifacts.md |
| Unit 174/174; track-s 22/22; `tsc` **33 errors** | test-audit.md |
| Desktop checkbox default OFF; argv omits unless checked | code-review, scout-desktop-ux |
| `design-full-10k` / `design-pilot-200` **absent** here | scout-data-artifacts |
| Ethics: blocked≠none, product concurrency≤3, no solver in-tree | security-ethics-audit.md |
| CR: **APPROVE_WITH_NITS** (DCL extra; isolation test missing; inject test skips stripper) | code-review-track-s.md |

**Believed / stale — do not act on:**

| Claim | Reality |
|-------|---------|
| “Ship 1.0.10 polish” (260826-09:09) | **Done.** Wave 1 closed. |
| “CI missing / tag pending” (ci-and-release-gap) | **Done.** CI + pack preview + tag exist. |
| Deploy-readiness pitfall “keepAlive still shared-tab” | **Stale.** Later CR + 0/61 cross-domain. Isolation is on HEAD. |
| “Need a new probe algorithm” | Contradicted by 37.6% + 0 true→false. |
| Win smoke HITL proved installer UX | Paper PASS; downloadCount 0. Residual, not a 1.0.10 blocker. |

---

## 1. Verdict

**Land Track S as 1.0.11 opt-in (default OFF). Do not retag 1.0.10. Do not wait for n=200 to merge the isolation fix. Do not treat golden FAIL or compile red as a probe-parallel rollback.**

1.0.10 is a closed customer binary. The working tree is a **different product increment**: faster ok-site path-probe + the keepAlive isolation fix desktop always needs (`--scan-profile`, concurrency 2/3). Directional PASS unlocks **opt-in**, not marketing speed, not default ON.

Largest honest gaps after that land: (1) n=200 production gate blocked on missing cohort, (2) golden/CF + mohd.it detector, (3) Track A unmeasured, (4) Track B unmeasured, (5) `tsc` ungated. Those are **measure/improve**, not ship-blockers for an unchecked checkbox.

## 2. What you should do

Ordered. One lane at a time.

### SHIP (P0) — 1.0.11 opt-in

1. **Commit Track S WT** on a branch, bump **1.0.11**. Isolation + `--probe-parallel` + desktop **Quét đường dẫn song song** unchecked. Do not pack as 1.0.10.
2. **Same PR nits (cheap, load-bearing):**
   - Isolation regression test: two `openPage()` ≠ keepAlive; no profile skip-close.
   - Path-probe inject tests via `toInjectableSource` (not raw `toString()`).
   - e2e: `#probeParallel` exists and **unchecked**.
   - `docs/desktop-windows.md` §4: add flag to default-off list. No “~30–40%” SLA. Ordinary Vietnamese. Does not giảm Chưa rõ.
3. **Name `domcontentloaded` in 1.0.11 notes as hang-fix**, not as probe-parallel. Keep it (xvfb `load` hang was real; both A/B arms already used it). Do **not** add `--wait-until` (ceremony). Do **not** silently omit it from the changelog (CR I1).
4. **CLI `--profile` reject User Data** (security High; PRODUCT already forbids). Copy desktop `assertSafeJobPaths`.
5. Close 1.0.10 **on paper** (phase-01 / plan success criteria still say tag pending). Do not re-execute Wave 1.

### MEASURE (P1) — after land, parallelizable

Lanes must not share one A/B.

| Lane | What | Pass evidence |
|------|------|----------------|
| **Throughput production** | Recover real `design-pilot-200` **or** re-collect Trustpilot `design` limit 200. No pads (`out/track-s-smoke` 160 `*.invalid`). Add missing goldens `thorvalddesign.com`, `pazzodesign.it`. Re-run `track-s-ab.sh` with **only** `--probe-parallel` delta; `--profile-timing` both arms **or** neither. | `n: 200`, `directional: false`, wall ≥25%, 200/200, `GATE: PASS` **without** directional banner |
| **Golden** | Dedicated 13-site job, not n=61 cohort. vecteezy: HITL `--scan-profile`, no bypass. mohd.it: human-check `/en/trade-and-professionals/` → update golden to `partner_trade/low` **or** tighten `trade` with precision tests (hits ozdesign/williamwood). | `verify-golden.mjs` docs/07 §5; blocked goldens documented as Track B exceptions, not throughput FAIL |
| **Track A** | Copy cohort ≥50; control vs `--network-evidence` only. | Metrics A2; **keep default OFF** until lift |
| **Track B** | After customer jobs exist: ≥500 **new** rows; access-unknown (blocked+timeout+error)/n. | Code slug **only if** still >20% after runbook. KPI is access %, not unknown%↓ from Track A/S |
| **HITL Win** | Optional. 1.0.10 paper PASS is closed. Re-run Start→Stop→Resume→Mở CSV **selected job** on 1.0.11 NSIS if you will claim “customer-ready Windows”. | Second sign-off block; do not rewrite delegated PASS |

### IMPROVE (P2) — do not put on the 1.0.11 critical path

1. Isolation **behavior** tests (in-flight ≤3, junk-before-paths, sibling abort) — test-audit items 1–3.
2. Compile: `allowImportingTsExtensions` (clears 16/33 TS5097) + 17 real holes; **then** add `npm run compile` to CI. Not before green locally. Separate `tsconfig.cli.json` later (`cli/` excluded today — how keepAlive survived tsc).
3. Probe abort: keep **partial `pathHits`** (or mark both arms incomplete) before the n=200 A/B if you want cleaner isolation. Current discard-all is the biggest semantic confounder; not a 1.0.11 blocker (0 true→false).
4. `--early-exit` A/B on copy cohort **alone**. Default stays OFF unless skip ≥15% of ok on n≥80 **and** quality holds.
5. Security next: extension options `innerHTML` href XSS; CLI `delay-ms` min 1000; cap `shard-scan --shards` (global ≤3 unless explicit operator flag).
6. Desktop UX (not ship-blocking): hide CF panel until challenge; filter empty “Không khớp bộ lọc”; Vietnamese path-escape / orphan dialog; rewrite probe hint (no junk/path/%).
7. Electron 39.8/44 before any **signed** Windows build. Signing remains PRODUCT-undecided.

## 3. What you should not do

- Retag / rebuild **v1.0.10** with Track S mixed in.
- Claim **37.6%** as 10k or customer SLA (n=61 none-heavy; interrupt gap; no `timingsMs` on the gate run).
- Default-ON `--probe-parallel` on directional PASS.
- Fail Track S land because golden 7/11. Fail golden because throughput PASS.
- New path-probe algorithm / adaptive batch / stop-on-hit / `waitUntil: 'commit'`.
- Pad n=200 with `*.invalid` or random domains.
- Point `--profile` at personal Chrome User Data to “fix” vecteezy.
- CF solver, stealth, `page.route` evasion, concurrency >3.
- Claim unknown%↓ from network-evidence or probe-parallel (unknown = access).
- Bundle early-exit + probe-parallel + dcl in one A/B.
- Asset abort without a Track A recall A/B (fingerprint + network-evidence).
- English i18n, in-app results table, extension live-golden as a desktop blocker.
- Treat `npm run compile` red as a 1.0.11 ship gate (CI never ran it; 1.0.10 shipped anyway).
- Restore 10k from this tree — **data lost** here. Re-collect is a new job.
- Trust `out/track-s-smoke/` as pilot-200.

## 4. Cheaper paths (effort → impact)

| Rank | Move | Why cheaper than the tempting alternative |
|------|------|-------------------------------------------|
| 1 | Land opt-in 1.0.11 | Isolation fix already in source; checkbox already wired OFF |
| 2 | Isolation unit test | Prevents 16/61-class desktop poison; hours not a plan slug |
| 3 | Docs + copy | Phase-5 customer hole; no engine risk |
| 4 | CLI `--profile` guard | One High ethics hole; copy existing desktop helper |
| 5 | Dedicated 13-site golden | Don’t overload n=61/n=200 throughput jobs |
| 6 | Compile config flag | 16 errors die without product behavior change |
| 7 | n=200 collect | Ops, not code — only path to production GATE |
| — | New probe algo | **Negative** ROI on current evidence |

## 5. Recommended route (current → goal)

```text
NOW          1.0.10 GitHub Latest (use it). WT dirty = 1.0.11 material.
     │
     ├─ SHIP 1.0.11  isolation + probe-parallel OFF + docs + profile guard
     │               + isolation/inject/e2e locks
     │               changelog: DCL hang-fix named
     │
     ├─ MEASURE (parallel, separate outs)
     │     n=200 throughput A/B  → production GATE or stay directional
     │     13-site golden        → Track B HITL + mohd.it golden update
     │     Track A sample ≥50    → keep flags OFF
     │
     ├─ IMPROVE
     │     tsc green → CI compile
     │     partial-hit on probe abort (before n=200 if easy)
     │     early-exit A/B
     │     UX copy / CF panel / XSS
     │
     └─ ONLY IF
           n=200 GATE: PASS unlabeled  → consider CLI default-ON
                                        (desktop checkbox may stay opt-in)
           Track B window >20% access-unknown after runbook → new timeout slug
           n=200 speedup <25% AND isolation clean → then (only then) revisit probe
```

**Default-ON probe-parallel** is a product call **after** production GATE. Desktop may stay unchecked even if CLI flips — ask then, not now.

## 6. Benefits

- Customer installer includes the isolation fix (desktop always `--scan-profile`).
- Operators get a measured opt-in speed lever without ethics change.
- Golden / access / compile stop blocking (or being blocked by) throughput.
- Next A/B can be honest: n=200, timings on, lanes split.
- 1.0.10 remains a clean “last known good” binary.

## 7. Trade-offs

| Decision | Cost | Stop being right when | Switch cost |
|----------|------|------------------------|-------------|
| Land on directional n=61 | Speedup may shrink on 10k-like mix; 4 paired diffs unexplained (no timings) | n=200 speedup <25% **or** true→false >0 | Flip default stays OFF; revert flag is one checkbox |
| Keep DCL without a flag | SPA with <5 anchors at 1.2s settle → blocked/unknown | Golden ok-sites drop after 1.0.11 vs 1.0.10 | Revert `waitUntil: 'load'` or add flag later |
| Skip HITL Win on 1.0.10 | Unsigned NSIS, 0 downloads, paper PASS | First real Windows user hits SmartScreen/CSV path | Run checklist on 1.0.11 |
| Defer Track A/B code | ~31% unknown stays a **stale 2026-08-13** stat | Fresh ≥500-row window still >20% access-unknown | New slug; don’t sneak into 1.0.11 |
| Defer compile CI | Type drift can land again | `tsc` still red when you add the CI step | Fix 33 first, then gate |
| Accept mohd.it as detector not probe | Golden matrix stays dirty until update | Human says “trade” link is noise | Keyword tighten + precision tests |

Disagreement with CR I1 (flag DCL): **noted**. Flag is extra surface for a hang-fix already in both A/B arms. Changelog + keep is the cheaper honesty.

---

## 8. Prioritized checklist

### Ship — 1.0.11 (do in this order)

- [ ] **S1** Branch `feat/track-s` (or similar). Bump package to **1.0.11**. Never pack as 1.0.10.
- [ ] **S2** Land isolation (`newPage` + always close) + `--probe-parallel` CLI default OFF + desktop checkbox unchecked.
- [ ] **S3** Isolation regression test (distinct pages; no keepAlive return; no profile skip-close).
- [ ] **S4** Inject tests through `toInjectableSource`; e2e `#probeParallel` unchecked.
- [ ] **S5** `docs/desktop-windows.md` + `desktop/README.md` + root README: flag in default-off list; no % SLA; not for Chưa rõ.
- [ ] **S6** Changelog: probe-parallel opt-in **and** `goto` `domcontentloaded` hang-fix (named, not hidden).
- [ ] **S7** CLI `--profile` reject Chrome User Data / pin optional app root (desktop helper).
- [ ] **S8** `npm run test:track-s` + `npm test` + `npm run test:desktop:e2e` green on the branch.
- [ ] **S9** Tag **v1.0.11** after pack preview; GitHub Release. Do not reuse v1.0.10.
- [ ] **S10** Mark 1.0.10 plan/audit checkboxes **done** (tag exists, delegated smoke). Stop re-planning Wave 1.

### Measure — after S2 at latest (parallel OK)

- [ ] **M1** Recover or re-collect **real** 200 companies. `build-track-s-cohort.mjs` prints `n: 200`, `directional: false`. Include thorvalddesign + pazzodesign. Delete or ignore padded `out/track-s-smoke`.
- [ ] **M2** Production A/B: only `--probe-parallel` differs; deny `*design-full-10k*`; both arms complete. Prefer `--profile-timing` on a **second** pair after wall-clock, or both-on if you accept timings in the gate JSONL.
- [ ] **M3** Production label: metrics end `GATE: PASS` with **no** directional banner **or** stay directional and do not default-ON.
- [ ] **M4** Dedicated 13-site golden job → `verify-golden.mjs`. vecteezy HITL or documented CF exception. mohd.it human-check → golden update **or** keyword plan.
- [ ] **M5** Relabel finalize: do not call affiliate-high FN “Golden FP=0”.
- [ ] **M6** Track A: ≥50-domain control vs `--network-evidence`. Written keep-OFF recommendation.
- [ ] **M7** Track B: ≥500-row window after 1.0.10/11 ops. Access-unknown % vs 20% bar. **No code** if ops not run.
- [ ] **M8** Optional: 1.0.11 Win HITL Start→Stop→Resume→Mở CSV selected job. Append sign-off; don’t rewrite 1.0.10 paper PASS.

### Improve — not on 1.0.11 critical path

- [ ] **I1** path-probe in-flight cap / junk-first / sibling-abort unit tests.
- [ ] **I2** Partial pathHits (or paired incomplete) on 90s abort — before M2 if cheap.
- [ ] **I3** `allowImportingTsExtensions` + fixture/`trustpilot-reader` holes → `tsc` exit 0 → CI `npm run compile`.
- [ ] **I4** `tsconfig.cli.json` so `cli/scan.ts` / `cli/browser.ts` cannot regress isolation silently.
- [ ] **I5** `--early-exit` isolated A/B on copy cohort; default OFF unless E4.
- [ ] **I6** Extension options: DOM `href`, http(s) only (XSS).
- [ ] **I7** CLI `delay-ms` ≥1000; `shard-scan` global parallelism cap.
- [ ] **I8** Desktop: CF panel hide-until-challenge; filter empty state; VN error strings; probe hint rewrite.
- [ ] **I9** Electron upgrade before signed NSIS. Signing still a PRODUCT decision.
- [ ] **I10** If 10k is needed again: archive `companies.json` + shard `results.jsonl` + manifest **outside** gitignored `out/` / `*.log`.

## 9. Success metrics

Each row is verifiable. No vibes.

### Ship (1.0.11)

| Metric | Target | Verify |
|--------|--------|--------|
| Customer 1.0.10 untouched | Tag `v1.0.10` still points at pre-Track-S commit | `git rev-parse v1.0.10^{}` ≠ Track S merge |
| Version | `package.json` **1.0.11** on the land commit | `jq -r .version package.json` |
| Probe-parallel default | OFF on CLI and desktop | `npm test` desktop-adapter omit flag; e2e `#probeParallel` `isChecked()===false` |
| Isolation lock | Suite fails if `openPage` returns keepAlive | new test exists and `npm run test:track-s` exit 0 |
| Ethics | 0 blocked→none; concurrency clamp 1..3; batch 1..3 | classify tests; `clampConcurrency` / `clampProbeBatchSize` |
| Docs | Checkbox in default-off list; no 30–40% guarantee | `docs/desktop-windows.md` grep |
| Profile | CLI rejects User Data | unit test + `assertSafeJobPaths` reuse |
| Unit / e2e | 174+ unit pass; desktop e2e no new fail | `npm test`; `npm run test:desktop:e2e` |
| Release | GitHub Release **v1.0.11** NSIS >50 MB | `gh release view v1.0.11` |

### Measure

| Metric | Target | Verify |
|--------|--------|--------|
| Directional honesty until M3 | Any n<200 file keeps DIRECTIONAL banner | `metrics-track-s-ab.md` header |
| Production throughput | n=200, speedup ≥25%, both complete, 0 true→false, 0 blocked→none, 0 cross-domain | `GATE: PASS` **unlabeled**; `directional: false` in cohort JSON |
| Do **not** claim | 320/h or 37.6% on 10k | no README/customer string with those numbers |
| Golden §5 | 4/4 affiliate-high **or** listed CF exception; 0 blocked→none; 0 false-affiliate on remaining none-cases | `node test/verify-golden.mjs <13-site results.json>` |
| mohd.it | Golden matches human B2B call | fixture + `docs/data` date |
| Track A | Sample n≥50; `method=network` count documented; default still OFF | metrics report; desktop checkboxes unchecked |
| Track B | Access-unknown ≤20% on ≥500 new rows **or** explicit “still high → new slug” | counts from merge CSV; no stealth |
| False-claim audit | Zero “quality upgrade measured”; zero “1.0.10 has probe-parallel”; zero unknown%↓ from A/S | grep docs/README/release notes |

### Improve / health

| Metric | Target | Verify |
|--------|--------|--------|
| Compile | `npm run compile` exit 0 **before** CI step added | local tsc; then `ci.yml` contains compile |
| Probe isolation tests | in-flight ≤3 under delayed fetch mock | `test/path-probe.test.ts` |
| XSS | no string-interpolated `href=` in options detail | `entrypoints/options/main.ts` |
| 10k recoverability | if a 10k job runs again, manifest+jsonl copied to a non-gitignored archive | path exists outside `out/` or is explicitly backed up |
| Default-ON parallel | **Forbidden** until unlabeled `GATE: PASS` on n=200 | PRODUCT / desktop checkbox still default off until then |

### Hard stop (any lane)

| Signal | Action |
|--------|--------|
| true→false >0 on paired A/B | do not land default-ON; investigate before next ship |
| blocked→none >0 | ethics incident; revert classify/export, not “fix unknown” |
| Cross-domain `finalUrl` >0 on profile concurrency≥2 | isolation regression; block desktop ship |
| CF solver / personal profile / concurrency>3 proposed | reject |

---

## Unresolved (need a human, not more scouting)

1. Accept directional PASS as 1.0.11 merge unlock? **This advise says yes.** Hold only if you refuse any speed claim adjacent to the checkbox.
2. Restore `design-pilot-200` from another disk vs re-collect 200?
3. Is `out/design-full-10k` alive on another machine? This host: **no**.
4. mohd.it “Trade & Professionals”: real B2B or keyword noise?
5. After production GATE: CLI default-ON vs desktop forever opt-in?
6. Promote code signing, or keep SmartScreen “Run anyway”?

---

**STATUS: DONE**  
**Handoff:** `/ak:plan` or `/ak:cook` on **S1–S9** only. M/I are other slugs. Do not reopen 1.0.10 Wave 1.
