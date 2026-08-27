# APF Independent Evaluation — Herdr OMP Swarm

**Started:** 2026-08-27  
**Workspace:** w15 (affiliate-partner-finder only)  
**Orchestrator:** Cursor lead + Herdr CLI  

## Layout

| Tab | Label | Agents | Focus |
|-----|-------|--------|-------|
| w15:t6 | apf-eval-arch | 4 OMP | Architecture, scan pipeline, data artifacts, status research |
| w15:t7 | apf-eval-quality | 4 OMP | Tests, code review, security/ethics, golden gate |
| w15:t8 | apf-eval-roadmap | 4 OMP | Deploy readiness, perf next steps, desktop UX, advisory synthesis |

## Agents (ev-*)

| Agent | Skill | Report |
|-------|-------|--------|
| ev-arch-scout | ak:scout | scout-architecture.md |
| ev-scan-pipe | ak:scout | scout-scan-pipeline.md |
| ev-data-art | ak:scout | scout-data-artifacts.md |
| ev-status-rsr | ak:research | research-project-status.md |
| ev-test-audit | ak:test | test-audit.md |
| ev-code-rev | ak:code-review | code-review-track-s.md |
| ev-security | ak:security | security-ethics-audit.md |
| ev-golden | ak:test | golden-gate-status.md |
| ev-deploy-gap | ak:research | research-deploy-readiness.md |
| ev-perf-next | ak:research | research-next-optimizations.md |
| ev-product-ux | ak:scout | scout-desktop-ux.md |
| ev-advise-rd | ak:advise | advise-deployment-roadmap.md |

## Monitor

```bash
herdr agent list | python3 -c "import json,sys; [print(a['name'],a['agent_status']) for a in json.load(sys.stdin)['result']['agents'] if a.get('name','').startswith('ev-')]"
tail -f plans/reports/orchestrate-260827-apf-eval/dispatch.log
ls -la plans/reports/orchestrate-260827-apf-eval/*.md
```

## Scripts

- `scripts/herdr-apf-eval.sh` — create tabs + start agents
- `scripts/herdr-apf-eval-dispatch.sh` — prompt all agents (advise runs last)

## Status

**Completed:** 2026-08-27 09:46 +07 — all 12 agents done. See `dispatch.log`.

## Synthesis

Final integrated roadmap: [`advise-deployment-roadmap.md`](./advise-deployment-roadmap.md)
