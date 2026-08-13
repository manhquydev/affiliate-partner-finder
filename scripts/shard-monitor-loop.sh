#!/usr/bin/env bash
# Human-readable shard monitor — append report every INTERVAL sec + ETA from rolling rate.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
MANIFEST="${1:-out/design-full-10k-shards/shard-manifest.json}"
REPORT="${2:-plans/reports/shard-monitor-live.log}"
INTERVAL="${3:-120}"
STATE="${4:-plans/reports/shard-monitor-state.json}"
BASE_DONE=688
TARGET=7465

mkdir -p "$(dirname "$REPORT")"
mkdir -p "$(dirname "$STATE")"

while true; do
  TS="$(date '+%Y-%m-%d %H:%M:%S %Z')"
  {
    echo "=== SHARD MONITOR $TS (tick=${INTERVAL}s) ==="
    python3 - <<PY
import json, time, subprocess
from pathlib import Path
from datetime import datetime, timedelta

base = $BASE_DONE
target = $TARGET
state_path = Path("$STATE")
now = time.time()

rows = []
extra = 0
for i in range(3):
    p = Path(f'out/design-full-10k-shards/shard-{i}/progress.json')
    if not p.exists():
        rows.append(f"shard-{i}: NO progress.json")
        continue
    j = json.loads(p.read_text())
    age = int(now - p.stat().st_mtime)
    extra += j['completed']
    rows.append(f"shard-{i}: {j['completed']}/{j['total']} age_s={age}")

total = base + extra
pct = total / target * 100 if target else 0
print("\\n".join(rows))
print(f"TOTAL≈{total}/{target} ({pct:.1f}%)")

# Rolling ETA from last tick
eta_line = "ETA: chưa đủ dữ liệu (cần ≥2 tick)"
prev = None
if state_path.exists():
    try:
        prev = json.loads(state_path.read_text())
    except Exception:
        prev = None

if prev and prev.get('total') is not None and prev.get('ts'):
    dt = now - float(prev['ts'])
    dtotal = total - int(prev['total'])
    if dt >= 60 and dtotal > 0:
        per_hour = dtotal / dt * 3600
        remaining = max(0, target - total)
        eta_h = remaining / per_hour if per_hour > 0 else float('inf')
        finish = datetime.now() + timedelta(hours=eta_h)
        eta_line = (
            f"ETA: ~{eta_h:.1f}h nữa ({finish.strftime('%Y-%m-%d %H:%M')}) "
            f"@ {per_hour:.0f} công ty/h (Δ{dtotal} trong {int(dt//60)}m)"
        )
    elif dtotal <= 0:
        eta_line = "ETA: checkpoint chưa tăng — kiểm tra shard treo (age_s>720?)"

state_path.write_text(json.dumps({'ts': now, 'total': total}))
print(eta_line)

try:
    n = int(subprocess.check_output(
        "pgrep -af 'cli/index.ts.*design-full-10k-shards/shard' | grep -c 'cli/index.ts' || true",
        shell=True, text=True,
    ).strip() or 0)
except Exception:
    n = 0
print(f"cli_procs={n} xvfb={subprocess.getoutput('pgrep -c Xvfb || echo 0')}")
PY
    npm run shard:merge -- --manifest "$MANIFEST" 2>&1 | tail -3 || true
    echo
  } | tee -a "$REPORT"

  echo "AGENT_LOOP_TICK_shard10k report=$REPORT ts=$TS interval=${INTERVAL}s"
  sleep "$INTERVAL"
done
