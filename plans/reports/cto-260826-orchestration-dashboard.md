---
type: cto-dashboard
date: 2026-08-26
plan: plans/260826-0909-next-deployment-scope
main: 56f8616+
---

# CTO Dashboard — Affiliate Partner Finder

## Executive status: **YELLOW** (code ready, release gated)

| Wave | % | Owner | Blocker |
|------|---|-------|---------|
| Phase 1 code | 95% | **Done** | Win smoke + tag |
| Phase 2 hygiene | 100% | **Done** | — |
| Phase 3 Track A | 25% | **Deferred** | No merge CSV on dev; sample now 50 |
| Phase 4 Track B | 0% | **Hold** | Phase 3 decision |

**North star progress:** Desktop 1.0.10 on `main` — customer can use workspace UX; **GitHub Release still 1.0.9** until tag.

---

## Agent roster & assignments

| Agent | Role | Task | Status |
|-------|------|------|--------|
| **Cursor (CTO pane)** | Orchestrator | E2E fix, commit, PR | Active |
| **tester** (Task) | QA | Regression 152+10 | Done → flaky fixed |
| **project-manager** (Task) | PM | Status matrix | Done |
| **Herdr OMP `tester`** w15:p4 | QA parallel | npm test (prior) | Timeout — use Task instead |
| **Human operator** | Release | Win VM smoke checklist | **BLOCKED** |
| **Ops** | Quality | Merge CSV + run track-a-ab | **Queued** |

---

## Critical path (do not parallelize wrongly)

```text
Win smoke PASS → tag v1.0.10 → CI NSIS → customer release
        ↑
   HUMAN ONLY
```

Parallel safe now:
- Plan sync-back ✅
- Track A defer doc + seed script ✅ (this commit)
- E2E isolation fix ✅

---

## Decisions (CTO)

1. **Hold tag** until `test-260826-win-smoke-110.md` signed PASS
2. **Track A deferred** with written evidence — not blocking desktop release
3. **Fix e2e flake** (runs dir cleanup + jobFilter clear) before any release claim
4. Herdr OMP `--wait` unreliable at 120–180s — prefer **Task subagents** for test/review

---

## Next dispatch (after this commit)

| Priority | Action | Agent |
|----------|--------|-------|
| P0 | Win smoke on VM | Human |
| P0 | Merge e2e fix PR | git-manager |
| P1 | Tag after smoke | Human + CI |
| P2 | Ops: `./scripts/track-a-ab.sh` + seed + A/B | Ops + agent |

---

## Evidence links

- PR #7, #8 merged
- `plans/reports/test-260826-phase01-desktop-110.md`
- `plans/reports/test-260826-win-smoke-110.md` (pending)
- `plans/reports/metrics-260826-track-a-ab-deferred.md`
- `scripts/track-a-ab.sh`, `scripts/seed-track-a-companies.mjs`
