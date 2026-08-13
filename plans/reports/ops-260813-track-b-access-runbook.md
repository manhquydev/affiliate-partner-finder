# Ops runbook — Track B (access / blocked / timeout)

**Timestamp:** 2026-08-13 08:17 +07  
**Plan link:** `plans/260813-0816-network-lazy-settle-quality-track-a/phase-05-ops-track-b-notes.md`  
**Rule:** No CAPTCHA bypass · concurrency ≤3 · do not kill 10k without user OK

## Baseline (R2 freeze n=3659)

| Slice | n | % |
|-------|--:|--:|
| unknown | 1145 | 31.3% |
| └ blocked | 588 | 51.4% of unknown |
| └ timeout | 530 | 46.3% of unknown |
| └ error | 27 | 2.4% of unknown |
| unknown × ok | **0** | — |
| Recent rate (last 1h CSV) | ~21–25/h | cooling vs ~108/h span avg |

## Watch

1. `plans/reports/shard-monitor-live.log` (tick 120s) — ETA + age_s  
2. Per-shard `progress.json` mtime — if age_s > 720, consider relaunch  
3. `cli_procs` / Xvfb count = 3 expected  

## Actions (HITL / ops)

| Symptom | Action |
|---------|--------|
| age_s high, process dead | `npm run shard:relaunch` (user-approved) |
| blocked spike / CF | Complete challenge on real display once; resume with `--scan-profile` |
| rate <50/h sustained | Inspect Chrome SingletonLock / profile locks; relaunch one shard |
| Want timeout code changes | **New plan** — not Track A |

## Explicit non-actions

- Do not raise `--concurrency` above 3  
- Do not install stealth/undetected bypass stacks  
- Do not apply Track A network/MO mid-flight expecting unknown%↓  

## Success signal for Track B (ops)

- unknown growth rate slows (new unknowns / hour ↓)  
- shard age_s typically < 300 under load  
- Optional later: code plan for goto budget — only after this runbook proves process health
