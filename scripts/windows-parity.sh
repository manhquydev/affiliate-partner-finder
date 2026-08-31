#!/usr/bin/env bash
# Windows-parity gate — same contracts the NSIS app uses on win32.
# Safe on Linux (simulates win32 paths/argv) and on windows-latest (real Node/Electron).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OS_FAMILY=unix
case "$(uname -s 2>/dev/null || echo unknown)" in
  MINGW*|MSYS*|CYGWIN*|Windows_NT) OS_FAMILY=windows ;;
esac
if [[ "${OS:-}" == "Windows_NT" ]]; then OS_FAMILY=windows; fi

echo "== windows-parity ($(node -p "require('./package.json').version")) host=$OS_FAMILY =="

echo "-- compile (hard) --"
npm run compile

echo "-- hide-chrome win32 (no Xvfb re-exec) --"
npx vitest run test/hide-chrome-window.test.ts test/windows-parity.test.ts

echo "-- desktop adapter win32 + profile guard --"
npx vitest run test/desktop-adapter.test.ts test/cli-profile-guard.test.ts -t "win32|User Data|LOCALAPPDATA|Documents|virtualDisplay|probe-parallel"

echo "-- scan handoff (stagger / nav / profile lock) --"
npx vitest run test/cli-scan-stagger.test.ts test/cli-nav-failure.test.ts test/cli-profile-lock.test.ts

echo "-- source invariants --"
if grep -E 'id="probeParallel"[^>]*checked' desktop/renderer/index.html; then
  echo "FAIL: #probeParallel must not be checked" >&2
  exit 1
fi
grep -q 'id="probeParallel"' desktop/renderer/index.html
grep -qE 'shell:[[:space:]]*false' desktop/job-supervisor.ts
if grep -qE 'shell:[[:space:]]*true' desktop/job-supervisor.ts; then
  echo "FAIL: desktop spawn must not use shell:true" >&2
  exit 1
fi
grep -q -- '--start-minimized' cli/hide-chrome-window.ts
grep -q LOCALAPPDATA desktop/build-scan-argv.ts
grep -q 'User Data' lib/safe-paths.ts

if [[ "$OS_FAMILY" == windows ]]; then
  echo "-- electron e2e on real Windows --"
  npm run test:desktop:e2e
else
  echo "-- skip electron e2e here (Linux xvfb is desktop:validate; this gate is win32 contracts) --"
fi

echo ""
echo "PASS windows-parity — win32 hide-chrome / paths / argv / locks match the Windows app"
