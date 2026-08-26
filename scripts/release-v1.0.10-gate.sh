#!/usr/bin/env bash
# Post–Win-smoke release gate. Run ONLY after test-260826-win-smoke-110.md is signed PASS.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SMOKE_REPORT="$ROOT/plans/reports/test-260826-win-smoke-110.md"
TAG="v1.0.10"

if ! "$ROOT/scripts/check-win-smoke-signoff.sh" "$SMOKE_REPORT"; then
  echo "Run Win VM checklist first: docs/desktop-windows.md" >&2
  exit 1
fi

ver="$(node -p "require('./package.json').version")"
if [ "$ver" != "1.0.10" ]; then
  echo "REFUSE: package.json version is $ver, expected 1.0.10" >&2
  exit 1
fi

npm test
npm run test:desktop:e2e

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Tag $TAG already exists locally."
else
  git tag -a "$TAG" -m "Desktop 1.0.10 — selected-job CSV IPC, browse while running"
fi

echo ""
echo "Ready to push tag (human/agent approval required):"
echo "  git push origin $TAG"
echo ""
echo "Then verify GitHub Actions release-desktop.yml produces NSIS >50MB."
