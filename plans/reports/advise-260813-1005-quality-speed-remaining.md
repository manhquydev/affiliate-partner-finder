# Advise Report: Remaining APF work (quality + speed)

**Timestamp:** 2026-08-13 10:05 +07  
**Mode:** Interview self-answered per user directive (“ưu tiên chất lượng và tốc độ… brainstorm tự trả lời… rồi pipeline”)  
**Inputs:** redteam-0900 partition, rollup CR×RT, ops-0918 resume/desktop wire, live 10k ~4114/7465

## Understanding (pre-interview)

Remaining work is **not** “port more AI crawlers”. It is: land incomplete desktop/CLI wire, **measure** Track A, keep 10k healthy without mid-flight flag flips, defer Track B code / extension until evidence says otherwise.

## Self-answered interview

| # | Question | Self-answer (locked) |
|---|----------|----------------------|
| 1 | Primary sprint win? | **Quality with speed constraint** — prove/enable Track A recall path without slowing live 10k or ETA. |
| 2 | Ship wire vs measure first? | **Both, sequenced:** (1) finish/land wire already coded; (2) **bounded** A/B `--network-evidence` only on copy cohort. |
| 3 | Include `--lazy-settle` A/B now? | **No this sprint** — settle can hurt A7 (speed). Defer until network A2 shows lift. |
| 4 | Track B timeout product code? | **Out** — ops runbook only; unknown% ≠ Track A. |
| 5 | Extension parity? | **Out** — CLI-first until A/B positive. |
| 6 | Touch live 10k flags? | **Never** this sprint. |
| 7 | A/B size? | **≤80 domains** control+treatment (speed) — directional A2; full 200 later if lift. |

## Confirmed reframing

- **Problem:** Track A code is on `main` / local wire incomplete on desktop IPC; quality lift **unmeasured**; speed must not regress live job.
- **Requirements:**
  1. Desktop UI/IPC + early-exit×networkHits complete and tested.
  2. ETA refuses near-zero rates.
  3. Sample domain list + separate `--out` A/B with `--network-evidence`.
  4. Metrics note for A2 (±A1) without claiming unknown%↓.
  5. Live 10k argv unchanged (no network/lazy).
- **Goals:** Measurable `method=network` / platform recall signal on sample; wire shippable; 10k keeps progressing.
- **Non-goals:** Lazy A/B, extension webRequest, LLM, Track B timeout code, flag-on 10k, Crawl4AI ports.
- **Constraints:** concurrency≤3; ethics/HITL CF; YAGNI; A7>A6 if conflict.

## Verdict

Do **not** open a mega “quality upgrade v2” feature plan. The highest leverage is **close the wire gap + measure network evidence on a small cohort**. That serves quality (evidence) and speed (skip lazy; keep 10k clean; early-exit skips probe when network hits).

## What to do / not do

**Do:** land wire → sample A/B network → metrics report → stop.  
**Don't:** enable flags on shards; claim unknown%↓; extension; lazy settle default ON.

## Work checklist → plan

- [ ] Phase: polish/verify desktop+early-exit+ETA (local already largely done)
- [ ] Phase: build ≤80 `none@ok` / ok sample domains
- [ ] Phase: control vs `--network-evidence` treatment jobs (new `--out`)
- [ ] Phase: write metrics compare report (A2 primary; A1 if n ok)
- [ ] Gate: `npm test` green; 10k untouched

## Success metrics

| Metric | Target |
|--------|--------|
| Unit tests | `npm test` exit 0 |
| Live 10k | Still running; argv without network/lazy |
| A/B | ≥1 treatment run with `method=network` count documented |
| Claims | Zero unknown%↓ attribution to Track A |
