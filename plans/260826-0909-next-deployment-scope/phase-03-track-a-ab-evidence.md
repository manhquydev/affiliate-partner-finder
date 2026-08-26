---
phase: 3
title: "Track A A/B evidence"
status: deferred
note: "Preflight fail on dev: no merge CSV. See metrics-260826-track-a-ab-deferred.md"
---

# Phase 3: Track A A/B evidence

## Overview

Run bounded `--network-evidence` A/B on a **copy cohort** (separate `--out` dirs). Never enable flags on live `design-full-10k`. Produce metrics report with A2 bind or explicit defer.

## Requirements

- Functional: Build domain sample list from merge CSV/jsonl (≥50 none@ok low-link + ok mix).
- Functional: Control re-scan (flags OFF) vs treatment (`--network-evidence`) in separate output folders.
- Non-functional: concurrency ≤3; no unknown% KPI claim; golden none=0 new affiliate FP.

## Related Code Files

- Create: `plans/reports/track-a-none-ok-sample-domains.txt`
- Create: `plans/reports/metrics-260826-track-a-ab.md`
- Read: `cli/index.ts` (flags default false), `lib/network-collector.ts`

## Implementation Steps

0. **Preflight:** Confirm merge CSV/jsonl on ops machine OR regenerate sample ≥50 domains; extend `plans/reports/track-a-none-ok-sample-domains.txt` if needed.
1. Create `scripts/track-a-ab.sh` with allowlist `out/track-a-*` only; deny `*design-full-10k*`; `set -euo pipefail`.
2. Seed `companies.json` into `./out/track-a-control` and `./out/track-a-network` from sample list before `--resume`.
3. Run **control** (flags OFF) to completion — **sequential, no parallel profile use**.
4. Run **treatment** with `--network-evidence` only after control finishes.
5. Write `plans/reports/metrics-260826-track-a-ab.md` with A2 bind or defer reason.

## Success Criteria

- [ ] Metrics report with A2: ≥40 `method=network` OR ≥5× platform/network vs control, OR written defer with reason
- [ ] No changes to live 10k shard argv
- [ ] `npm test` still 152 pass after any script additions

## Risk Assessment

| Risk | Response |
|------|----------|
| Sample cherry-picking | Fixed list file committed before runs |
| FP affiliate from allowlist | Tighten `lib/network-hosts.ts` if FP found |
| Time cost | Cap at ≤80 domains |

## Non-goals

- Lazy-settle A/B (speed regression risk)
- Extension inject parity
