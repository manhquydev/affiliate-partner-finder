---
title: "Windows desktop GUI Electron shell"
description: "Thin Electron UI wrapping Playwright CLI for non-dev Windows customers; live progress + HITL CSV."
status: completed
note: "Delivered desktop v1.0.10 on main (PR #7). See plans/260826-0909-next-deployment-scope/phase-01."
priority: P1
effort: "3-5d"
tags: [desktop, electron, windows, gui, customer]
created: 2026-08-12
blockedBy: []
blocks: []
related:
  - plans/reports/brainstorm-260812-0931-windows-desktop-gui.md
  - plans/reports/research-260812-0932-windows-desktop-gui.md
  - plans/reports/research-260812-0936-electron-packaging-mvp.md
---

# Windows desktop GUI Electron shell

## Overview

CLI is developer-only. Customers need a **Windows-installable GUI** that starts/resumes scans, shows live progress, helps with Cloudflare once, and exports simple HITL CSV (`ket_qua` true/false/unknown). **Reuse** existing Playwright CLI + `lib/` — do not rewrite the engine. Linux overnight jobs (e.g. `out/design-full-10k`) stay untouched.

## Brainstorm contract (accepted)

| Field | Content |
|-------|---------|
| **Outcome** | Non-dev installs Windows app, runs scan with on-screen progress, gets `results.csv` |
| **Constraints** | Reuse CLI; ethics ≤3 concurrency; simpleHit semantics; system Chrome + `--scan-profile`; local-only |
| **Non-goals** | Engine rewrite; Tauri/Wails v1; CF bypass; extension-as-bulk; macOS/Linux GUI parity ship; stop Linux ops |
| **Acceptance** | Install without npm; live completed/total + ket_qua counts + CF panel + resume; non-ok never false |

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Pure TS job adapter (args, progress watch, jsonl counts) with Vitest | P1 |
| 2 | Vietnamese progress UI (renderer) wired to adapter | P1 |
| 3 | Electron main spawns CLI (dev + packaged path) | P1 |
| 4 | electron-builder NSIS config + Windows docs (unsigned OK internal) | P2 |

## Architecture

```text
Electron renderer (VI UI)
    ↔ preload IPC
Electron main → spawn(CLI) ──► Playwright + system Chrome (--scan-profile)
                ↑ watch out/progress.json + results.jsonl
                ↓ on exit open results.csv (toSimpleCSV)
```

**Packaging (research):** electron-builder NSIS; esbuild CLI into `extraResources` (no tsx); `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`; `channel: 'chrome'`.

## Phases

| # | Phase | Status | Depends |
|---|-------|--------|---------|
| 1 | [Foundation & contracts](./phase-01-start.md) | Pending | — |
| 2 | [Job runner adapter TDD](./phase-02-job-runner-adapter-tdd.md) | Pending | 1 |
| 3 | [Vietnamese progress UI](./phase-03-vietnamese-progress-ui.md) | Pending | 2 |
| 4 | [Electron main spawn wire](./phase-04-electron-main-spawn-wire.md) | Pending | 2,3 |
| 5 | [Windows package and docs](./phase-05-windows-package-and-docs.md) | Pending | 4 |

## Success Criteria

- [ ] `npm test` covers adapter (args, progress parse, simpleHit counts from jsonl)
- [ ] Dev: Electron window starts scan via adapter; progress updates without terminal
- [ ] Defaults: concurrency≤3, delay≥1000, `--scan-profile` on, no `--virtual-display` on win32
- [ ] Profile path default for desktop uses `%LOCALAPPDATA%\affiliate-partner-finder\chrome-profile` via `--profile`
- [ ] Docs: Windows install + CF HITL + resume; README links desktop
- [ ] design-full-10k / Linux CLI path unchanged

## Evidence / research

- Scout: CLI progress shape `cli/index.ts`; jsonl incremental; CSV end-only; `tsx` is devDependency
- Brainstorm + research reports under `plans/reports/research-260812-093*`

## Risks

| Risk | Mitigation |
|------|------------|
| tsx missing in packaged app | esbuild CLI entry in phase 5; phase 4 use `tsx` only in dev |
| SingletonLock dual jobs | GUI single-flight lock |
| CSV not ready mid-run | UI derives counts from jsonl; “Mở CSV” after exit |
| Unsigned SmartScreen | Document; signing P1 post-MVP |

## Open questions (defaults for validate)

1. Distribution: **portable/internal unsigned NSIS** first (Recommended)
2. Chrome: **require system Google Chrome** (Recommended)
3. Batch size UX: **optimize for hundreds; overnight ok** with resume
4. Pause: **stop process + --resume** (Recommended)
5. Multi-job: **one active job** (Recommended)

## Red Team Review

**Date:** 2026-08-12 · **Lenses:** Security, Assumptions, Failure Modes · **Applied:** auto (pipeline cook)

| # | Sev | Finding | Disposition |
|---|-----|---------|-------------|
| 1 | Crit | Unvalidated `--profile` can point at real Chrome User Data | **Accept** — contain profile/out under app root; reject Chrome User Data paths |
| 2 | Crit | Hard tree-kill orphans SingletonLock / wrong Chrome | **Accept** — soft SIGINT first; track child PID only; Singleton* hygiene on app profile |
| 3 | High | delay≥1000 not enforced | **Accept** — clamp delayMs ≥1000 in adapter + UI |
| 4 | High | Pack allowlist missing | **Accept** — phase 5 files allowlist; exclude out/, .env, profiles |
| 5 | High | openOutDir/openCsv path escape | **Accept** — realpath under job out only |
| 6 | Crit | Stop exits before CSV write | **Accept** — adapter `writeSimpleCsvFromJsonl` on stop/idle |
| 7 | High | LOCALAPPDATA only if env set | **Accept** — every win32 argv includes `--profile` abs path |
| 8 | High | No current domain in progress.json | **Accept** — parse CLI stdout `scan`/`done` lines into status |
| 9 | Crit | Start on existing out rewrites companies.json | **Accept** — refuse Start if companies.json/jsonl exists; force Resume or new out |
| 10 | High | Electron crash loses single-flight | **Accept** — persist `job.json` (pid,out,profile); rebind/refuse on launch |
| 11 | High | Truncated jsonl / progress rename races | **Accept** — tests for partial line; last-good progress |
| 12 | Crit | esbuild without Node runtime for customers | **Accept** — phase 5: `ELECTRON_RUN_AS_NODE` or ship node; document Win smoke gate |
| 13 | High | Linux smoke ≠ Windows done | **Accept** — marketing “customer ready” blocked until one Win VM checklist; Linux = unit+dev only |

### Whole-Plan Consistency Sweep

- All phases updated for soft-stop, path containment, delay clamp, Start-vs-Resume guard, CSV-from-jsonl, stdout current domain, job.json.
- Zero unresolved contradictions for cook of phases 1–4; phase 5 Win `.exe` artefact = manual gate.

## Validation Log

**Session 1 — 2026-08-12** (pipeline defaults; user chained validate→cook)

| # | Topic | Decision |
|---|-------|----------|
| 1 | Distribution | Internal unsigned NSIS / portable first |
| 2 | Chrome | Require system Google Chrome |
| 3 | Batch size | Hundreds primary; overnight via resume OK |
| 4 | Pause | Soft stop + `--resume` |
| 5 | Multi-job | One active job + job.json |
| 6 | Path safety | App-owned profile/out roots only |
| 7 | CSV mid-run | Generate from jsonl on demand; end CLI CSV still authoritative when exit 0 |

**Verification:** Scout claims on progress shape / jsonl incremental / CSV end-only / DEFAULT_PROFILE_DIR / delay Math.max(0) — VERIFIED against `cli/index.ts`, `cli/browser.ts`.

## Next

`/ak:cook --tdd` this plan (phases 1–5 code; Win installer smoke = checklist).

<!-- slug: windows-desktop-gui-electron-shell -->
