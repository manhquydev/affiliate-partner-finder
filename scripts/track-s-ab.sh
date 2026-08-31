#!/usr/bin/env bash
# Track S A/B — control vs --probe-parallel. Never touches design-full-10k.
set -euo pipefail
set -o pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COHORT="${TRACK_S_COHORT:-./plans/reports/track-s-benchmark-cohort-200.json}"
CONTROL_OUT="${TRACK_S_CONTROL_OUT:-./out/track-s-ab-control}"
TREATMENT_OUT="${TRACK_S_TREATMENT_OUT:-./out/track-s-ab-treatment}"
REPORT="${TRACK_S_AB_REPORT:-./plans/reports/metrics-track-s-ab.md}"

SCAN_EXTRA=()
if [[ "$(uname -s)" == "Linux" ]]; then
  SCAN_EXTRA+=(--virtual-display)
fi

deny_production() {
  local out="$1"
  case "$out" in
    *design-full-10k*) echo "REFUSE: production cohort: $out" >&2; exit 1 ;;
  esac
  case "$out" in
    ./out/track-s-*|out/track-s-*) return 0 ;;
    *) echo "REFUSE: out must match out/track-s-* (got $out)" >&2; exit 1 ;;
  esac
}

deny_production "$CONTROL_OUT"
deny_production "$TREATMENT_OUT"

if [[ ! -f "$COHORT" ]]; then
  echo "Missing cohort. Run: node scripts/build-track-s-cohort.mjs" >&2
  exit 1
fi

rm -rf "$CONTROL_OUT" "$TREATMENT_OUT"
mkdir -p "$CONTROL_OUT" "$TREATMENT_OUT"

node scripts/seed-track-s-companies.mjs "$COHORT" "$CONTROL_OUT"
echo "[track-s] CONTROL → $CONTROL_OUT"
CONTROL_START=$(date +%s)
npm run scan -- --resume --out "$CONTROL_OUT" --query track-s-benchmark --scan-profile \
  --accept-failures --concurrency 2 "${SCAN_EXTRA[@]}"
CONTROL_SEC=$(( $(date +%s) - CONTROL_START ))
echo "[track-s] CONTROL done in ${CONTROL_SEC}s"
echo "[track-s] profile handoff wait (same --scan-profile after control close)"
sleep 5

node scripts/seed-track-s-companies.mjs "$COHORT" "$TREATMENT_OUT"
echo "[track-s] TREATMENT (--probe-parallel) → $TREATMENT_OUT"
TREATMENT_START=$(date +%s)
npm run scan -- --resume --out "$TREATMENT_OUT" --query track-s-benchmark --scan-profile \
  --accept-failures --concurrency 2 --probe-parallel "${SCAN_EXTRA[@]}"
TREATMENT_SEC=$(( $(date +%s) - TREATMENT_START ))
echo "[track-s] TREATMENT done in ${TREATMENT_SEC}s"

node scripts/compare-track-s-ab.mjs "$CONTROL_OUT/results.jsonl" "$TREATMENT_OUT/results.jsonl" --out /tmp/track-s-ab-compare.md

node scripts/finalize-track-s-ab.mjs "$CONTROL_OUT" "$TREATMENT_OUT" "$CONTROL_SEC" "$TREATMENT_SEC" "$COHORT" || {
  echo "[track-s] GATE: FAIL (see $REPORT)"
  exit 1
}

{
  echo ""
  echo "---"
  echo ""
  cat /tmp/track-s-ab-compare.md
} >> "$REPORT"

echo "[track-s] report → $REPORT"
