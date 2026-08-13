# Code Review — quality-speed wire + A/B pipeline

**Timestamp:** 2026-08-13 10:30 +07  
**Scope:** desktop wire, early-exit×network, ETA floor, A/B ops (no lazy on 10k)  
**Mode:** `--parallel --auto --hard` post-cook

## Verdict: **PASS_WITH_ISSUES**

Implementation matches locked plan. A/B honesty preserved (DIRECTIONAL, no unknown% claim). Residual: local wire still **uncommitted** on `main`; A2 DoD unmet (expected at n=40 none-biased).

## Findings

| Sev | Finding | Action |
|-----|---------|--------|
| Med | Wire changes not on `main` yet | Ship PR when user asks |
| Med | A2 null lift on none@ok-40 | Next: stratified ≥200 sample (new plan) |
| Low | Network hit on blocked correctly → unknown | Keep |
| Info | Full suite **131 passed** | OK |

## Edge checks

| Check | Status |
|-------|--------|
| Default OFF desktop | Handled |
| 10k no Track A flags | Verified during A/B |
| Classify refuses affiliate on blocked+networkHits | Verified in treatment row |

## Must-fix

None for merge of wire (tests green). Do **not** enable network on live 10k based on this A/B.
