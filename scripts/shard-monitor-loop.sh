#!/usr/bin/env bash
# Human-readable shard monitor — append report every INTERVAL sec + echo tick for agent notify.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
MANIFEST="${1:-out/design-full-10k-shards/shard-manifest.json}"
REPORT="${2:-plans/reports/shard-monitor-live.log}"
INTERVAL="${3:-300}"
BASE_DONE=688

mkdir -p "$(dirname "$REPORT")"

while true; do
  TS="$(date '+%Y-%m-%d %H:%M:%S %Z')"
  {
    echo "=== SHARD MONITOR $TS ==="
    python3 - <<PY
import json, time, subprocess
from pathlib import Path
base=$BASE_DONE
rows=[]
extra=0
for i in range(3):
    p=Path(f'out/design-full-10k-shards/shard-{i}/progress.json')
    if not p.exists():
        rows.append(f"shard-{i}: NO progress.json")
        continue
    j=json.loads(p.read_text())
    age=int(time.time()-p.stat().st_mtime)
    extra+=j['completed']
    rows.append(f"shard-{i}: {j['completed']}/{j['total']} age_s={age}")
total=base+extra
print("\\n".join(rows))
print(f"TOTAL≈{total}/7465 ({total/7465*100:.1f}%)")
try:
    n=int(subprocess.check_output("pgrep -af 'cli/index.ts.*design-full-10k-shards/shard' | grep -c 'cli/index.ts' || true", shell=True, text=True).strip() or 0)
except Exception:
    n=0
print(f"cli_procs={n} xvfb={subprocess.getoutput('pgrep -c Xvfb || echo 0')}")
PY
    npm run shard:merge -- --manifest "$MANIFEST" 2>&1 | tail -3 || true
    echo
  } | tee -a "$REPORT"

  echo "AGENT_LOOP_TICK_shard10k report=$REPORT ts=$TS"
  sleep "$INTERVAL"
done
