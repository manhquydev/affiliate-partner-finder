# Plan Validate: Track A — network lazy settle quality

**Timestamp:** 2026-08-13 08:17 +07  
**Role:** PLAN VALIDATE (read + write report only — no product code, no commit, no scan kill)  
**Plan:** `plans/260813-0816-network-lazy-settle-quality-track-a/`  
**Inputs:** plan.md + phases 01–05; `brainstorm-260813-0816-track-abc-quality.md`; `validate-260813-0815-apf-quality-upgrade-r2.md`  
**Live recheck:** `out/design-full-10k/results.full.csv` + `results.merged.jsonl` @ validate time

## Verdict (one line)

Track A plan is **cook-ready**: phases 1–4 are implementable against verified CLI hooks; KPIs match live `unknown×ok=0`; Track B stays ops-separated. Bind R2 numeric A1–A7 into phase-4 metrics before claiming DoD.

## Checks requested

| Check | Result | Evidence |
|-------|--------|----------|
| Phases cookable | **PASS** | File/symbol targets exist; deps DAG clean (1→2∥3→4; 5 parallel) |
| KPIs match live (`unknown×ok=0`) | **PASS** | Live n=3662 still `unknown×ok=0`; freeze ~3659 in plan/R2 aligned |
| Acceptance testable | **PASS_WITH_CONCERNS** | Golden/unit/smoke clear; R2 A1–A7 numbers not copied into phase-4; A3 labels still missing |
| Track B separated | **PASS** | Phase 5 docs-only; runbook already at `ops-260813-track-b-access-runbook.md`; no product code in Track A for unknown% |

## Live KPI recheck vs plan freeze

| Metric | Plan / R2 freeze (~3659) | Live @ 08:17 (n=3662) | Match? |
|--------|-------------------------:|----------------------:|:------:|
| `unknown × ok` | **0** | **0** | ✓ |
| unknown | 1145 (31.3%) | 1146 | ✓ drift +1 |
| `none@ok` | 1739 | 1740 | ✓ |
| `affiliate@ok` | 161 | 161 | ✓ |
| affiliates with nonempty `platformHits` | 12/161 | **12**/161 | ✓ |
| CSV `method=platform` (affiliates) | 12 | 12 | ✓ |

**Implication (R2 holds):** Track A must not use raw `unknown%` as success. FN pool = `none@ok`. Access failures remain Track B.

## Code verification (cook hooks)

| Claim | Status | Evidence |
|-------|--------|----------|
| Classify row-1: non-ok → unknown | VERIFIED | `lib/classify.ts` L17–20 |
| Platform evidence → affiliate/high | VERIFIED | `lib/classify.ts` L23–27 (`platformHits.length`) |
| Export method union lacks `network` | VERIFIED gap | `lib/export.ts` L10: `'link' \| 'platform' \| 'path' \| ''` — phase 1 must extend |
| CLI settle = fixed timeout today | VERIFIED | `cli/scan.ts` L90 `settle(page, 1200)`; `cli/browser.ts` L162–163 `waitForTimeout` |
| No network listeners yet | VERIFIED gap | No `page.on('request'\|'response')` in CLI scan path |
| Host matcher lives in inject detector | VERIFIED | `lib/detector.ts` `isPlatformHost`; platforms in `lib/config.ts` `AFFILIATE_PLATFORMS` |
| Scan budget constant | VERIFIED | `DEFAULT_SCAN_BUDGET_MS` in `cli/scan.ts` |
| `--lazy-settle` not shipped | VERIFIED gap | CLI flags: `--scan-profile` etc.; no lazy-settle yet (phase 3) |
| Extension parity deferred | VERIFIED | Plan non-goal; matches R2 CLI-first |

## Pass/Fail per phase

### Phase 1 — Contracts & classify merge — **PASS** (cookable)

- Clear edits: `lib/types.ts`, `lib/classify.ts`, `lib/export.ts`, preferred `lib/network-hosts.ts`.
- Merge rule can mirror existing `hasPlatform` path; must preserve `loadStatus!=='ok'` → unknown.
- Unit-testable without Playwright.
- **Cook note:** Prefer fold `networkHits` into classify the same way as `platformHits`, with `method=network` in export — matches architecture diagram.

### Phase 2 — Network evidence layer — **PASS** (cookable)

- Hook point before `goto` in `cli/scan.ts` is real; observe-only constraint explicit (no `page.route` rewrite).
- Reuses host-boundary rules; CDN alias table called out (R2 gap #2 — in-scope, not a blocker to start).
- Smoke acceptance (“demo affiliate → nonempty networkHits”) is testable.
- **Cook note:** Always-on observe-only is ETA-safe; do not relaunch live 10k mid-flight for this PR.

### Phase 3 — MutationObserver settle — **PASS** (cookable)

- Replaces/augments known `waitForTimeout(1200)` settle; budget + flag requirements match R2 gate B.
- Depends only on phase 1 → can parallel phase 2.
- Success criteria (budget cap, no CAPTCHA, README flag) are testable.
- **Cook note:** Default off or same ~1200ms envelope; hard-stop vs `DEFAULT_SCAN_BUDGET_MS`.

### Phase 4 — Tests golden metrics — **PASS_WITH_CONCERNS** (cookable; DoD incomplete until metrics bound)

| Acceptance piece | Testable now? | Gap |
|------------------|---------------|-----|
| Golden FP=0 / `npm test` | Yes | — |
| Host matcher FP unit tests | Yes | — |
| Measurement recipe on `none@ok` sample | Yes (docs/script) | — |
| R2 **A1** (+≥1.0 pp affiliate% among ok) | Partial | Not listed numerically in phase-4 |
| R2 **A2** (≥5× platform/network hits) | Partial | Plan says qualitative “↑ hits” only |
| R2 **A3** (≥8 true flips on 30–50 labeled FN) | **No** | Labeled sample still missing (R2 open gap) |
| R2 **A6/A7** latency/throughput budgets | Partial | Need explicit copy into metrics baseline report |
| `unknown%` as Track A KPI | Correctly excluded | Matches brainstorm + R2 |

**Required before claiming Track A DoD (not before starting cook):** paste R2 §5 A1–A7 into `plans/reports/metrics-*-track-a-baseline.md`; collect A3 labels before advertising lift.

### Phase 5 — Ops Track B notes — **PASS** (separated; largely pre-done)

- Docs-only; deps `[]` — parallel, not on critical path for code cook.
- Deliverable already exists: `plans/reports/ops-260813-track-b-access-runbook.md` (baseline, HITL, no-bypass, “timeout code = separate plan”).
- Does **not** mix blocked/timeout product work into phases 1–4.
- **Cook note:** Phase 5 can mark complete by linking runbook from plan; no product code.

## Track B separation audit

| Item | OK? |
|------|-----|
| Brainstorm C: A code first, B ops parallel | ✓ locked in plan overview |
| Plan non-goal: unknown% as Track A KPI | ✓ |
| Phase 5 = runbook, not retry/CF code | ✓ |
| Success criteria: “shards not modified mid-flight” | ✓ |
| No LLM-on-unknown / Crawl4AI / concurrency↑ | ✓ |

## Consistency vs brainstorm + R2

| Source decision | Plan reflects? |
|-----------------|---------------|
| Choose C (A then B ops) | ✓ |
| Network + MO for false-`none` on ok | ✓ phases 2–3 |
| unknown = access failures | ✓ freeze table + KPIs |
| Gate D LLM FAIL | ✓ non-goal |
| Extension parity later | ✓ |
| Outcome Contract Track A MVP | ✓ |

## Cook-ready?

**YES — cook-ready for phases 1→2∥3→4.** Phase 5 is ops/docs and may complete in parallel without blocking implementation.

### Pre-cook checklist (non-blocking except noted)

1. Do **not** treat unknown%↓ as ship gate.  
2. During phase 4, **import R2 A1–A7** into the baseline metrics report (fix soft “↑” wording for DoD).  
3. A3 HITL labels = measurement gate, not a reason to delay phase 1–3 code.  
4. Leave live design-full-10k shards alone; ship via normal resume when user relaunches.  
5. Optional: mark phase 5 todos done once plan.md links the existing runbook.

## STATUS: COOK_READY_WITH_CONCERNS

Concerns: (1) phase-4 must bind R2 numeric A1–A7 before DoD claims; (2) A3 labeled FN sample still absent; (3) live n drifted 3659→3662 — freeze numbers remain valid, `unknown×ok` still 0.
