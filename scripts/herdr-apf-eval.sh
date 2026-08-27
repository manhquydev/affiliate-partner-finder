#!/usr/bin/env bash
# Herdr OMP evaluation swarm for affiliate-partner-finder (workspace w15 only).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ "${HERDR_ENV:-}" != "1" ]]; then
  echo "Not inside Herdr-managed pane (HERDR_ENV!=1)" >&2
  exit 1
fi

WS="${HERDR_WORKSPACE_ID:-w15}"
CWD="$ROOT"

json_field() {
  python3 -c "import json,sys; d=json.load(sys.stdin); $1"
}

split_panes_grid() {
  local tab_id="$1"
  local root_pane="$2"
  local n="$3"
  # Build up to 6 panes: split right then down on left column.
  local p1="$root_pane"
  local p2 p3 p4 p5 p6
  p2=$(herdr pane split "$p1" --direction right --ratio 0.5 --cwd "$CWD" --no-focus 2>&1 | json_field "print(d['result']['pane']['pane_id'])")
  if (( n <= 2 )); then echo "$p1 $p2"; return; fi
  p3=$(herdr pane split "$p1" --direction down --ratio 0.5 --cwd "$CWD" --no-focus 2>&1 | json_field "print(d['result']['pane']['pane_id'])")
  p4=$(herdr pane split "$p2" --direction down --ratio 0.5 --cwd "$CWD" --no-focus 2>&1 | json_field "print(d['result']['pane']['pane_id'])")
  if (( n <= 4 )); then echo "$p1 $p2 $p3 $p4"; return; fi
  p5=$(herdr pane split "$p1" --direction right --ratio 0.33 --cwd "$CWD" --no-focus 2>&1 | json_field "print(d['result']['pane']['pane_id'])") || true
  p6=$(herdr pane split "$p2" --direction right --ratio 0.33 --cwd "$CWD" --no-focus 2>&1 | json_field "print(d['result']['pane']['pane_id'])") || true
  echo "$p1 $p2 $p3 $p4 ${p5:-} ${p6:-}"
}

start_tab_agents() {
  local label="$1"
  shift
  local -a names=("$@")
  local n="${#names[@]}"

  echo "== Creating tab: $label ($n agents) ==" >&2
  local tab_json root_pane tab_id
  tab_json=$(herdr tab create --workspace "$WS" --cwd "$CWD" --label "$label" --no-focus 2>&1)
  tab_id=$(printf '%s' "$tab_json" | json_field "print(d['result']['tab']['tab_id'])")
  root_pane=$(printf '%s' "$tab_json" | json_field "print(d['result']['root_pane']['pane_id'])")

  read -r -a panes <<< "$(split_panes_grid "$tab_id" "$root_pane" "$n")"
  # Use first n panes from grid (may include duplicates if split failed — guard below)
  local i=0
  for name in "${names[@]}"; do
    local pane="${panes[$i]:-$root_pane}"
    echo "  start $name on $pane" >&2
    herdr agent start "$name" --kind omp --pane "$pane" --timeout 120000 >/dev/null 2>&1 || {
      echo "  retry $name on fresh split" >&2
      local np
      np=$(herdr pane split "$root_pane" --direction down --cwd "$CWD" --no-focus 2>&1 | json_field "print(d['result']['pane']['pane_id'])")
      herdr agent start "$name" --kind omp --pane "$np" --timeout 120000 >/dev/null
    }
    ((i++)) || true
  done
  printf '%s\n' "$tab_id"
}

mkdir -p plans/reports/orchestrate-260827-apf-eval

echo "Herdr APF evaluation swarm — workspace $WS" >&2

T1=$(start_tab_agents "apf-eval-arch" ev-arch-scout ev-scan-pipe ev-data-art ev-status-rsr)
T2=$(start_tab_agents "apf-eval-quality" ev-test-audit ev-code-rev ev-security ev-golden)
T3=$(start_tab_agents "apf-eval-roadmap" ev-deploy-gap ev-perf-next ev-product-ux ev-advise-rd)

cat > plans/reports/orchestrate-260827-apf-eval/state.json <<EOF
{
  "startedAt": "$(date -Iseconds)",
  "workspace": "$WS",
  "tabs": {
    "apf-eval-arch": "$T1",
    "apf-eval-quality": "$T2",
    "apf-eval-roadmap": "$T3"
  },
  "agents": [
    "ev-arch-scout", "ev-scan-pipe", "ev-data-art", "ev-status-rsr",
    "ev-test-audit", "ev-code-rev", "ev-security", "ev-golden",
    "ev-deploy-gap", "ev-perf-next", "ev-product-ux", "ev-advise-rd"
  ]
}
EOF

echo "Tabs: arch=$T1 quality=$T2 roadmap=$T3" >&2
herdr agent list 2>&1 | python3 -c "
import json,sys
d=json.load(sys.stdin)
ev=[a for a in d['result']['agents'] if a.get('name','').startswith('ev-')]
print(f'ev-* agents live: {len(ev)}')
for a in ev:
  print(f\"  {a['name']:16} {a.get('agent_status','?'):8} {a.get('tab_id','')}\")
"
