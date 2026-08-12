---
phase: 5
title: "Windows package and docs"
status: pending
priority: P2
effort: "4-8h"
dependencies: [4]
---

# Phase 5: Windows package and docs

## Overview

esbuild CLI into `extraResources`, electron-builder NSIS (unsigned OK internal), Windows customer docs, README link. Skip Playwright browser download in pack.

## Requirements

- Functional: builder config produces win target (CI may only validate config on Linux)
- Non-functional: document SmartScreen; require system Chrome

## Architecture

Per `plans/reports/research-260812-0936-electron-packaging-mvp.md`: electron-builder > Forge; `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`; spawn packaged CLI via `process.resourcesPath`.

## Related Code Files

- Create: `desktop/electron-builder.yml` (or package.json build key), `scripts/bundle-cli.mjs`, `docs/desktop-windows.md`
- Modify: `README.md` (desktop section), `desktop/main.ts` packaged spawn path
- Modify: `package.json` scripts `desktop:pack`, `desktop:bundle-cli`

## File inventory

| Path | Action |
|------|--------|
| `scripts/bundle-cli.mjs` | Create esbuild entry for cli/index.ts + deps |
| `desktop/electron-builder.yml` | Create |
| `docs/desktop-windows.md` | Create |
| `README.md` | Modify |

## Tests Before

- Script dry-run: bundle-cli produces a js file that node can `--help` (may need playwright installed)

## Implementation Steps

1. esbuild CLI bundle (external playwright if needed or mark as external + ship node_modules subset — **YAGNI:** document that pack must run on machine with npm install).
2. electron-builder win nsis per-user; extraResources.
3. Docs: install Chrome → install app → CF once → resume → open CSV.
4. Note: full `.exe` artefact may be built on Windows agent; Linux verifies config + bundle script.

## Success Criteria

- [x] `docs/desktop-windows.md` exists with CF HITL steps
- [x] README points to desktop
- [x] Bundle script exists; builder config present
- [x] Packaged spawn path coded (even if exe built later on Win CI)

## Risk Assessment

Shipping full signed installer is out of scope — internal unsigned + docs is enough for this phase.
