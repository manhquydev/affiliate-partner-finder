#!/usr/bin/env bash
# Dispatch evaluation prompts to ev-* OMP agents (workspace w15).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
LOG="$ROOT/plans/reports/orchestrate-260827-apf-eval/dispatch.log"
mkdir -p "$(dirname "$LOG")"

dispatch() {
  local agent="$1"
  local prompt="$2"
  local timeout="${3:-900000}"
  echo "[$(date -Iseconds)] dispatch $agent (timeout ${timeout}ms)" >> "$LOG"
  if herdr agent prompt "$agent" "$prompt" --wait --timeout "$timeout" >> "$LOG" 2>&1; then
    echo "[$(date -Iseconds)] done $agent" >> "$LOG"
  else
    echo "[$(date -Iseconds)] fail $agent exit=$?" >> "$LOG"
  fi
}

# Tab 1 — architecture & status
dispatch ev-arch-scout '/ak:scout affiliate-partner-finder architecture. Map lib/, cli/, desktop/, extension/. Read PRODUCT.md README.md docs/. Write plans/reports/orchestrate-260827-apf-eval/scout-architecture.md with module map, scan→CSV flow, parity gaps. Read-only except report file.' &
dispatch ev-scan-pipe '/ak:scout scan pipeline. Deep-read cli/scan.ts cli/browser.ts lib/path-probe.ts lib/probe-batch.ts. Read plans/reports/metrics-track-s-ab.md. Write plans/reports/orchestrate-260827-apf-eval/scout-scan-pipeline.md: bottlenecks, isolation fixes, probe-parallel semantics, risks.' &
dispatch ev-data-art '/ak:scout data artifacts. Inventory out/ plans/reports/ cohort JSON A/B dirs. Write plans/reports/orchestrate-260827-apf-eval/scout-data-artifacts.md: n=200 gate data, golden, 10k shard recoverability.' &
dispatch ev-status-rsr '/ak:research project status. Read brainstorm-260826-0909-project-status-next-scope.md brainstorm-260827-track-s-status.md metrics-track-s-ab.md. Write plans/reports/orchestrate-260827-apf-eval/research-project-status.md: shipped vs gaps, Track S PASS implications.' &

# Tab 2 — quality
dispatch ev-test-audit '/ak:test full suite. Run npm run test:track-s and npm test. Note npm run compile errors. Write plans/reports/orchestrate-260827-apf-eval/test-audit.md with pass/fail, coverage gaps, isolation test recommendations.' &
dispatch ev-code-rev '/ak:code-review track-s changes. Review git diff cli/ lib/ desktop/ test/. Write plans/reports/orchestrate-260827-apf-eval/code-review-track-s.md with severity evidence recommendation per finding.' &
dispatch ev-security '/ak:security audit ethics. Review blocked≠none concurrency≤3 no CF bypass CSV handling Chrome profile. Write plans/reports/orchestrate-260827-apf-eval/security-ethics-audit.md. Read-only.' &
dispatch ev-golden '/ak:test golden gate. Run test/verify-golden.mjs if exists; document vecteezy mohd.it failures. Write plans/reports/orchestrate-260827-apf-eval/golden-gate-status.md separate from throughput gate.' &

# Tab 3 — roadmap (advise last — longer timeout)
dispatch ev-deploy-gap '/ak:research deploy readiness. Read brainstorm-260826-ci-and-release-gap.md package.json desktop/. Write plans/reports/orchestrate-260827-apf-eval/research-deploy-readiness.md: 1.0.10 polish smoke release blockers compile debt.' &
dispatch ev-perf-next '/ak:research next optimizations post track-s. Read research-260826-scan-performance-optimization.md metrics-track-s-ab.md. Write plans/reports/orchestrate-260827-apf-eval/research-next-optimizations.md ranked with gates.' &
dispatch ev-product-ux '/ak:scout desktop UX. Read desktop/renderer/ PRODUCT.md phase5 probe-parallel. Write plans/reports/orchestrate-260827-apf-eval/scout-desktop-ux.md customer gaps i18n docs needs.' &

wait

# Synthesis after parallel work
dispatch ev-advise-rd '/ak:advise deployment roadmap. Read all reports in plans/reports/orchestrate-260827-apf-eval/ plus metrics-track-s-ab.md brainstorm reports. Write plans/reports/orchestrate-260827-apf-eval/advise-deployment-roadmap.md: prioritized ship/measure/improve checklist and success metrics.' 1200000

echo "[$(date -Iseconds)] all dispatch complete" >> "$LOG"
