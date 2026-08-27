# Metrics — Track S baseline

**Date:** 2026-08-26  
**Cohort:** n=61 **DIRECTIONAL** (<200 target)  
**Source:** track-a-ab + none-ok + golden domains

## Pending

Run control arm timing diagnostic (optional):
```bash
node scripts/seed-track-s-companies.mjs plans/reports/track-s-benchmark-cohort-200.json out/track-s-timing-smoke
npm run scan -- --resume --out out/track-s-timing-smoke --query track-s-benchmark --scan-profile --profile-timing --accept-failures --concurrency 2
node scripts/analyze-track-s-timings.mjs out/track-s-timing-smoke/results.jsonl
```

Recover pilot-200 for full n=200 gate.
