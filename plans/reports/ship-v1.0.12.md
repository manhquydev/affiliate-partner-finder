# Ship report — v1.0.12 (Windows-parity + scan handoff)

**Date:** 2026-08-31  
**Tag:** `v1.0.12`  
**Prior:** `v1.0.11`

## Summary

Desktop + CLI **1.0.12** ships scan-handoff fixes (first-wave stagger, nav-failure classify, Chrome profile lock wait) and a **Windows-parity** test process that matches NSIS hide-chrome / `%LOCALAPPDATA%` / `shell:false`. `--probe-parallel` stays **OFF**. P6 n=200 remains **GATE: FAIL** (measurement, not a speed win).

## Features / fixes

| Item | Default | Notes |
|------|---------|-------|
| First-wave stagger | on | `firstWaveStaggerMs` — not `i * delay` over pending=200 |
| Nav failure classify | on | timeout / error / dead — no remap-all-to-timeout |
| Profile lock wait | on | wait for Singleton*; do not delete live locks |
| Weak keyword `trade` | `\btrade\b` | EU ODR `trader.register` is not a hit |
| `tsc --noEmit` | hard gate | compile is required in windows-parity |
| Windows-parity CI | on push | `ubuntu` + **`windows-latest`** |

## Test evidence (local, 2026-08-31)

```
PASS windows-parity (host=unix)
PASS desktop-validate (unit + e2e xvfb + windows-parity)
#probeParallel unchecked
probeParallel=false
```

Layer C Win VM HITL (`plans/reports/test-260831-win-smoke-112.md`) is **pending**. This tag is engineering-ready; customer-ready on a physical Windows box still needs that checklist.

## Not shipped as default-ON

`--probe-parallel` checkbox remains unchecked. Unlabeled production `GATE: PASS` was not earned on n=200.
