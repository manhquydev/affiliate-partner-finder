#!/usr/bin/env bash
# Pre-tag release gate: smoke sign-off + desktop-validate + version match.
# Usage: scripts/release-desktop-gate.sh [version] [smoke-report.md]
# Example: scripts/release-desktop-gate.sh 1.0.11 plans/reports/test-260827-win-smoke-111.md
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

EXPECTED="${1:-$(node -p "require('./package.json').version")}"
TAG="v${EXPECTED}"
SMOKE_REPORT="${2:-$ROOT/plans/reports/test-260827-win-smoke-111.md}"

echo "== release-desktop-gate $TAG =="

if ! "$ROOT/scripts/check-win-smoke-signoff.sh" "$SMOKE_REPORT"; then
  echo "Complete Win VM HITL first: $SMOKE_REPORT" >&2
  echo "See docs/desktop-release-workflow.md" >&2
  exit 1
fi

ver="$(node -p "require('./package.json').version")"
if [ "$ver" != "$EXPECTED" ]; then
  echo "REFUSE: package.json version is $ver, expected $EXPECTED" >&2
  exit 1
fi

"$ROOT/scripts/desktop-validate.sh"

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Tag $TAG already exists locally."
else
  git tag -a "$TAG" -m "Affiliate Partner Finder Desktop $TAG"
  echo "Created tag $TAG (push with: git push origin $TAG)"
fi

echo ""
echo "Ready for GitHub Release Desktop workflow after: git push origin main && git push origin $TAG"
