---
phase: 5
title: "End-to-End Verification vs Golden Set"
status: pending
priority: P1
effort: "0.5d"
dependencies: [4]
---

# Phase 5: End-to-End Verification vs Golden Set

## Overview
Prove the built extension satisfies the acceptance criteria: run the full pipeline
on query "design", compare verdicts against the golden set (`docs/07`), and audit
the ethical guardrails. This is the "Definition of Done" gate (`docs/02` §5).

## Requirements
- Functional: reproduce the results in `docs/data/test-results.json` for the golden domains.
- Non-functional: verify anti-hallucination + throttle guardrails hold under a real run.

## Architecture
Manual + assisted e2e (extension runtime can't be fully driven by Vitest). Load
unpacked in Chrome, run query "design" limit ~20, then reconcile the exported JSON
against `test/fixtures/golden.ts`. A small verification script compares exported
JSON to golden expectations and prints a pass/fail matrix.

## Golden Set (`docs/07` §2 — authoritative)
| Domain | Expected verdict |
|---|---|
| vecteezy.com, nordicnest.se, designbyamor.com, design-bestseller.de | affiliate/high |
| madeindesign.com, williamwoodmirrors.co.uk, ozdesignfurniture.com.au | partner_trade |
| namly.dk, finnishdesignshop.com, thorvalddesign.com, mohd.it, pazzodesign.it | none |
| flinders.nl | unknown/blocked |

## Related Code Files
- Create: `test/verify-golden.mjs` — load an exported `results.json`, assert against golden set, print matrix + pass/fail summary.
- Modify: `docs/07-test-plan.md` — append actual run date + any golden drift (only if a site changed structure).
- Modify: `README.md` (root) — "How to load unpacked", run instructions, known limitations.

## Implementation Steps
1. `wxt build`; load `.output/chrome-mv3` unpacked in Chrome.
2. Run query "design", limit ≥20, default delay; let queue finish.
3. Export JSON; run `node test/verify-golden.mjs results.json`.
4. Confirm §5 pass criteria (see below). Investigate any mismatch (redirect/lang edge cases per `docs/03` D lessons) before declaring pass.
5. Guardrail audit: observe only 1 scan tab open at a time; confirm delay; confirm blocked site not marked none; confirm no login/form/CAPTCHA interaction occurred.
6. Update README + test-plan notes.

## Status
- **Tooling + docs delivered:** `test/verify-golden.mjs` written and self-tested
  (13/13 golden match, all §5 rules PASS on synthetic data); README load-unpacked
  + run + verify instructions added; `docs/07` §7 status note added.
- **Automated proxy of the golden set:** the classify-level golden set is fully
  covered by Vitest (`test/fixtures/golden.ts`) and is GREEN — this proves the
  decision logic. The remaining criteria below require a real Chrome + live
  network and are a **manual acceptance gate** the user runs (see Implementation
  Steps). They are intentionally left unchecked until that live run.

## Success Criteria (`docs/07` §5)
- [x] classify-level golden match automated & green (Vitest golden fixtures).
- [x] Verification script + workflow delivered and self-verified.
- [ ] LIVE: 4/4 affiliate-high verdicts match on a real run.
- [ ] LIVE: 0 `blocked` case marked `none` (flinders.nl = `unknown/blocked`).
- [ ] LIVE: 0 false-affiliate across the 5 `none` cases.
- [ ] LIVE: every `affiliate` row has an `evidenceUrl` that resolves HTTP < 400.
- [ ] LIVE: ≥20 companies collected for "design"; CSV + JSON export valid.
- [ ] LIVE: guardrails hold (1 tab, throttle, no bypass, local-only).

## Risk Assessment
- Live sites drift since `docs/03` was captured (Aug 2026) → a golden mismatch may be real-world change, not a bug. Rule: re-verify the specific site manually; update golden + note the date rather than forcing a verdict (`docs/07` §6).
- `mohd.it` is a known soft-case (redirect to `/en/` may hide native-language affiliate) → accepted as `none/medium`; not a failure.
- Trustpilot bot-check may intermittently delay Collect → retry gently; not a verdict failure.
