#!/usr/bin/env bash
# Micro trial: 3 domains, control vs --probe-parallel. Safe out/track-s-trial-* only.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MICRO_N="${TRACK_S_MICRO_N:-3}"
COHORT="${TRACK_S_MICRO_COHORT:-./plans/reports/track-s-micro-cohort.json}"
CONTROL_OUT="${TRACK_S_TRIAL_CONTROL:-./out/track-s-trial-control}"
TREATMENT_OUT="${TRACK_S_TRIAL_TREATMENT:-./out/track-s-trial-treatment}"
REPORT="${TRACK_S_TRIAL_REPORT:-./plans/reports/metrics-track-s-trial.md}"

node scripts/build-track-s-micro.mjs "$MICRO_N"

for out in "$CONTROL_OUT" "$TREATMENT_OUT"; do
  case "$out" in
    *design-full-10k*) echo "REFUSE: $out" >&2; exit 1 ;;
    ./out/track-s-*|out/track-s-*) ;;
    *) echo "REFUSE: out must match out/track-s-* (got $out)" >&2; exit 1 ;;
  esac
done

rm -rf "$CONTROL_OUT" "$TREATMENT_OUT"
mkdir -p "$CONTROL_OUT" "$TREATMENT_OUT"

echo "[track-s trial] cohort=$COHORT n=$MICRO_N"

node scripts/seed-track-s-companies.mjs "$COHORT" "$CONTROL_OUT"
echo "[track-s trial] CONTROL (sequential probe) → $CONTROL_OUT"
npm run scan -- --resume --out "$CONTROL_OUT" --query track-s-trial \
  --accept-failures --concurrency 1 --profile-timing

node scripts/seed-track-s-companies.mjs "$COHORT" "$TREATMENT_OUT"
echo "[track-s trial] TREATMENT (--probe-parallel + --profile-timing) → $TREATMENT_OUT"
npm run scan -- --resume --out "$TREATMENT_OUT" --query track-s-trial \
  --accept-failures --concurrency 1 --profile-timing --probe-parallel

node scripts/analyze-track-s-timings.mjs "$CONTROL_OUT/results.jsonl" > /tmp/track-s-control-timings.txt
node scripts/analyze-track-s-timings.mjs "$TREATMENT_OUT/results.jsonl" > /tmp/track-s-treatment-timings.txt

{
  echo "# Track S micro trial"
  echo ""
  echo "**Date:** $(date -Iseconds)"
  echo "**Domains:** $MICRO_N"
  echo ""
  echo "## Control timings"
  echo '```'
  cat /tmp/track-s-control-timings.txt
  echo '```'
  echo ""
  echo "## Treatment timings"
  echo '```'
  cat /tmp/track-s-treatment-timings.txt
  echo '```'
  echo ""
} > "$REPORT"

node scripts/compare-track-s-ab.mjs "$CONTROL_OUT/results.jsonl" "$TREATMENT_OUT/results.jsonl" --out /tmp/track-s-compare.md
cat /tmp/track-s-compare.md >> "$REPORT"

echo "[track-s trial] report → $REPORT"
