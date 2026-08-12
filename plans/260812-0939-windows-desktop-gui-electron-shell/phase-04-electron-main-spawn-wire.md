---
phase: 4
title: "Electron main spawn wire"
status: pending
priority: P1
effort: "6-8h"
dependencies: [2, 3]
---

# Phase 4: Electron main spawn wire

## Overview

Electron main process: single-flight spawn of CLI with adapter argv, watch progress/jsonl, push status to renderer, stop = kill process tree, resume = `--resume`. Dev uses `tsx cli/index.ts`; document packaged path for phase 5.

## Requirements

- Functional: start/resume/stop; status IPC; Chrome missing → modal message
- Non-functional: contextIsolation; argv array spawn; never `--virtual-display` on win32

## Architecture

```text
ipcMain.handle('job:start') → buildScanArgv → spawn(tsx/node, args, {cwd})
setInterval → readProgress + countKetQua → webContents.send('job:status')
ipcMain.handle('job:stop') → tree-kill / process.kill
```

## Related Code Files

- Create: `desktop/main.ts`, `desktop/job-supervisor.ts`
- Modify: `package.json` — `desktop:dev` script; optional electron as **optionalDependency** or devDependency
- Reuse: phase-2 adapter modules

## File inventory

| Path | Action |
|------|--------|
| `desktop/main.ts` | Create |
| `desktop/job-supervisor.ts` | Create |
| `package.json` | Modify scripts + electron dep |

## Tests Before

- Unit-test `job-supervisor` pure pieces (state machine: idle→running→stopped) with mocked spawn if feasible
- Or keep supervisor thin and rely on adapter tests + manual smoke

## Implementation Steps

1. Add electron (devDependency) + `npm run desktop:dev`.
2. Implement JobSupervisor: spawn, status poll, stop.
3. Wire preload ↔ main IPC.
4. Chrome gate: check common Windows/mac/Linux chrome paths; if missing show dialog (do not auto-download).
5. Smoke on Linux (headed Chrome ok) without killing design-full-10k — use **different** `--out` and `--profile` dirs.

## Success Criteria

- [x] `npm run desktop:dev` opens UI
- [x] Start with tiny `--limit 2` writes progress under chosen out dir
- [x] Stop leaves resume-safe jsonl
- [x] Concurrent second Start rejected

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Killing wrong Chrome | Only kill spawned child tree; dedicated profile |
| Interfering with 10k job | Different out + profile paths mandatory in smoke |
| Electron version churn | Pin a current stable Electron major |

## Regression Gate

`npm test` + manual desktop smoke checklist in phase README
