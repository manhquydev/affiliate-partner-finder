# 2026-08-31 — Windows-parity process and v1.0.12

Built Layer A2 so Linux CI no longer pretends xvfb is Windows. The NSIS app hides Chrome with `--start-minimized` and off-screen bounds; profile lives under `%LOCALAPPDATA%`; spawn is `shell: false`. `scripts/windows-parity.sh` locks those contracts and runs Electron e2e on `windows-latest`.

Shipped with scan-handoff fixes from the P6 closeout (stagger, nav classify, Singleton wait) and `\btrade\b`. Did not flip `--probe-parallel`. Did not sign off Win VM HITL — checklist `test-260831-win-smoke-112.md` stays pending.
