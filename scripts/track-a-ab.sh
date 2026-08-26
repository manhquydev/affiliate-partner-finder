#!/usr/bin/env bash
# Bounded Track A A/B — control vs --network-evidence. Never touches design-full-10k.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CONTROL_OUT="${TRACK_A_CONTROL_OUT:-./out/track-a-control}"
TREATMENT_OUT="${TRACK_A_TREATMENT_OUT:-./out/track-a-network}"
SAMPLE="${TRACK_A_SAMPLE:-./plans/reports/track-a-none-ok-sample-domains.txt}"

deny_production() {
  local out="$1"
  case "$out" in
    *design-full-10k*) echo "REFUSE: out path matches production cohort: $out" >&2; exit 1 ;;
  esac
  case "$out" in
    ./out/track-a-*|out/track-a-*) return 0 ;;
    *) echo "REFUSE: out must match out/track-a-* (got $out)" >&2; exit 1 ;;
  esac
}

deny_production "$CONTROL_OUT"
deny_production "$TREATMENT_OUT"

if [[ ! -f "$SAMPLE" ]]; then
  echo "Missing sample list: $SAMPLE" >&2
  exit 1
fi

count="$(grep -cve '^\s*$' "$SAMPLE" || true)"
if [[ "$count" -lt 50 ]]; then
  echo "WARN: sample has $count domains (<50). Extend $SAMPLE before trusting A2 metrics." >&2
fi

echo "== Track A A/B preflight =="
echo "Control:   $CONTROL_OUT"
echo "Treatment: $TREATMENT_OUT"
echo "Sample:    $SAMPLE ($count domains)"
echo ""
echo "Run SEQUENTIALLY (shared Chrome profile):"
echo "  1) npm run scan -- --out $CONTROL_OUT --concurrency 2 --accept-failures"
echo "  2) npm run scan -- --out $TREATMENT_OUT --concurrency 2 --network-evidence --accept-failures"
echo ""
echo "Write metrics to plans/reports/metrics-260826-track-a-ab.md"
