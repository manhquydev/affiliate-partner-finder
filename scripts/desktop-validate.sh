#!/usr/bin/env bash
# Local desktop safety gate — run before tag, after code changes, or before customer handoff.
# Exit 0 only when all automated checks pass.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== desktop-validate ($(node -p "require('./package.json').version")) =="

echo "-- unit (full) --"
npm test

echo "-- track-s suite --"
npm run test:track-s

echo "-- desktop electron e2e --"
if command -v xvfb-run >/dev/null 2>&1; then
  xvfb-run -a npm run test:desktop:e2e
else
  npm run test:desktop:e2e
fi

echo "-- UI invariants (probe-parallel default OFF) --"
if grep -E 'id="probeParallel"[^>]*checked' desktop/renderer/index.html; then
  echo "FAIL: #probeParallel must not be checked by default in index.html" >&2
  exit 1
fi
if ! grep -q 'id="probeParallel"' desktop/renderer/index.html; then
  echo "FAIL: missing #probeParallel checkbox" >&2
  exit 1
fi

echo "-- windows-parity (win32 contracts) --"
bash "$ROOT/scripts/windows-parity.sh"

echo ""
echo "PASS desktop-validate — safe for CI pack preview / Win HITL checklist"
