---
phase: 3
title: "Vietnamese progress UI"
status: pending
priority: P1
effort: "4-6h"
dependencies: [2]
---

# Phase 3: Vietnamese progress UI

## Overview

Renderer UI (HTML/CSS/TS) in Vietnamese: query, limit, out dir, Start / Resume / Stop, progress bar, ket_qua counts, CF help panel, open folder/CSV. Talks to main via preload IPC stubs (mockable in tests if needed). UX crib: `entrypoints/options/` but columns = simple CSV.

## Requirements

- Functional: form + live status panels; CF help copy; ethics clamps reflected in UI labels
- Non-functional: no `nodeIntegration`; contextIsolation; accessible basic labels

## Architecture

Static files under `desktop/renderer/` loaded by Electron BrowserWindow (phase 4). Optional tiny pure functions for formatting progress text unit-tested.

## Related Code Files

- Create: `desktop/renderer/index.html`, `desktop/renderer/styles.css`, `desktop/renderer/app.ts` (or `.js` built later)
- Create: `desktop/preload.ts` (API surface types)
- Reference: `entrypoints/options/index.html`, `lib/export.ts` column names

## File inventory

| Path | Action |
|------|--------|
| `desktop/renderer/index.html` | Create |
| `desktop/renderer/styles.css` | Create |
| `desktop/renderer/app.ts` | Create |
| `desktop/preload.ts` | Create |

## Tests Before

- Pure format helpers if any (e.g. `formatProgress(completed,total)`) in `desktop/format.ts` + unit test
- Skip full Electron E2E in this phase

## Implementation Steps

1. Wireframe HTML matching brainstorm panel (progress, counts, CF banner).
2. Preload expose: `startJob`, `resumeJob`, `stopJob`, `getStatus`, `openOutDir`, `openCsv` (implementations phase 4).
3. Poll status every 1s while running; update DOM.
4. Disable Start when job running (single-flight).

## Success Criteria

- [x] UI loads offline (no CDN)
- [x] Labels Vietnamese for primary actions
- [x] Shows completed/total, true/false/unknown, CF panel text
- [x] No nodeIntegration in renderer

## Risk Assessment

Over-polishing CSS — keep simple readable layout; not marketing site.
