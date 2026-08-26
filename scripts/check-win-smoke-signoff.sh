#!/usr/bin/env bash
# Exit 0 when Win smoke checklist contains an explicit PASS sign-off.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SMOKE_REPORT="${1:-$ROOT/plans/reports/test-260826-win-smoke-110.md}"

if [ ! -f "$SMOKE_REPORT" ]; then
  echo "REFUSE: missing smoke report: $SMOKE_REPORT" >&2
  exit 1
fi

if grep -qE '^- Result: PASS$' "$SMOKE_REPORT"; then
  exit 0
fi

echo "REFUSE: $SMOKE_REPORT must contain exact sign-off line: - Result: PASS" >&2
exit 1
