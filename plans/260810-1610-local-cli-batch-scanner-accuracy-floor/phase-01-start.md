---
title: "Phase 1: Start"
status: todo
phase: 1
effort: "2-3h"
dependencies: []
---

<!-- Updated: Red Team Review 2026-08-10 -->

# Phase 1: Start

## Overview

Scaffold CLI package surface: Playwright + p-limit + tsx + `@types/node`, exclude `cli` from root `tsconfig.json`, npm scripts, README. Extension `npm test` / compile stay green. No product scan logic beyond a help stub.

## Requirements

- [x] Deps: `playwright`, `p-limit`, `tsx`, `@types/node` (Node 18+/20)
- [x] Root `tsconfig.json`: add `"exclude": ["cli"]` (or merge with existing exclude) — **no** `tsconfig.cli.json`
- [x] Scripts: `scan` / `cli` → `tsx cli/index.ts`
- [x] Directory `cli/` with minimal entry
- [x] README snippet: install Chromium/Chrome notes, example command, ethics (no CAPTCHA bypass)
- [x] `npm test` + `npm run compile` green after install

## Architecture

Single-package (no workspaces). Root WXT tsconfig stays for extension; CLI is **excluded** from root tsc so Node/`cli` types never fight Chrome types. CLI runs via **tsx** (no separate emit required for v1).

```
package.json scripts.scan → tsx cli/index.ts
cli/index.ts              → argv parse stub / --help only this phase
tsconfig.json             → exclude: ["cli", ...]
```

**Data flow this phase:** none (scaffolding only).

## Related Code Files

- Create: `cli/index.ts` (help + exit 0 stub)
- Modify: `tsconfig.json` — exclude `cli`
- Modify: `package.json` (deps + scripts)
- Modify: `README.md` (short CLI section)
- Do **not** create: `tsconfig.cli.json`
- Do **not** modify: `lib/*`, `entrypoints/*`, detector rules

## Implementation Steps

1. `npm i -D playwright p-limit tsx @types/node`.
2. `npx playwright install chromium` (document; prefer Chrome channel later for collect).
3. Update root `tsconfig.json` to exclude `cli` (RT-2 — dual-tsconfig ceremony dropped).
4. Add scripts:
   ```json
   "scan": "tsx cli/index.ts",
   "cli": "tsx cli/index.ts"
   ```
5. Write `cli/index.ts`: print usage (`--query`, `--limit`, `--concurrency`, `--delay-ms`, `--out`, `--resume`) and `process.exit(0)`.
6. README snippet: prerequisites, `npm run scan -- --help`, concurrency≤3, headed Trustpilot note, link ethics.
7. Run `npm test` and `npm run compile`; fix install fallout only.

## Todo

- [x] Install + lockfile update for playwright, p-limit, tsx, `@types/node`
- [x] `npx playwright install chromium` documented
- [x] Root `tsconfig.json` excludes `cli`
- [x] `package.json` scripts `scan` / `cli`
- [x] `cli/index.ts` help stub
- [x] README CLI snippet
- [x] `npm test` + compile green

## Success Criteria

- [x] `npm run scan -- --help` (or no-args usage) exits 0
- [x] `npm test` passes
- [x] `npm run compile` / build not broken by new deps
- [x] Root tsc does not typecheck `cli/`
- [x] No chrome-bound code required to run help stub

## Risk Assessment

| Risk | L×I | Mitigation |
|------|-----|------------|
| Playwright download size / CI fail | M | Document local install; do not require browsers for unit tests |
| postinstall `wxt prepare` broken by new dep | L | Re-run install; keep WXT scripts untouched |
| Root tsconfig picks up cli / chrome types conflict | H | Exclude `cli` from root (RT-2) |

## Rollback

Revert `package.json` / lockfile; delete `cli/`; restore `tsconfig.json` exclude + README.

## Test plan

- [x] `npm test`
- [x] `npm run compile`
- [x] `npm run scan -- --help`

## Validation Log

> `--auto` validation adopts the Decisions section in `plan.md` (and Red Team Review Accept table). Confirm exclude-`cli` approach and deps list match before cook.
