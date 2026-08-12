# Research Report: Windows-first desktop GUI for Affiliate Partner Finder

**Research conducted:** 2026-08-12 09:32 (UTC+7)  
**Output:** `plans/reports/research-260812-0932-windows-desktop-gui.md`  
**Scope:** Installable Windows GUI wrapping existing Node/TS Playwright CLI; live scan status; simple CSV (`ket_qua` true/false/unknown); one-time visible Chrome for Cloudflare HITL; resume long jobs; local-only.  
**Constraint:** ≤5 web searches; no code; do not touch running 10k scan.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Research Methodology](#research-methodology)
3. [Key Findings](#key-findings)
4. [Comparative Analysis](#comparative-analysis)
5. [Implementation Recommendations](#implementation-recommendations)
6. [Resources & References](#resources--references)
7. [Unresolved Questions](#unresolved-questions)
8. [Appendices](#appendices)

---

## Executive Summary

**Rank #1 for this repo: Electron shell + spawn existing CLI as child process.** Do not rewrite the scanner. Do not bundle Playwright Chromium for MVP. Keep `channel: 'chrome'` + dedicated persistent profile + headed windows for CF (already in `cli/browser.ts`). UI reads `progress.json` / `results.jsonl` and exports `results.csv` already produced by CLI.

**Why not Tauri / Wails / Neutralino for MVP:** existing engine is Node + Playwright. Tauri needs Rust + Node sidecar (`pkg`/SEA) + shell permissions — double toolchain, worse Playwright packaging. Wails is Go. Neutralino too thin for multi-hour headed browser ops. Size wins of Tauri vanish once you ship a Node sidecar anyway.

**Windows packaging:** `electron-builder` **NSIS** (per-user, optional admin). Auto-update via `electron-updater` later — **YAGNI for first customer build**. Skip Squirrel.Windows (deprecated for simplified updater). MSI only if enterprise GPO demands it (`msi-wrapped` if you still want updates).

**Install UX for non-devs:** one signed `.exe` installer → Start Menu app → “Install Google Chrome if missing” gate → pick query/out dir → Start/Pause/Resume → progress bar from CLI artefacts → Export CSV. Data under `%LOCALAPPDATA%\affiliate-partner-finder\` (profile + runs). Local-only by design.

**Brutal bottom line:** Electron is fat and AV-noisy, but it matches the stack, headed Chrome, and small-team maintainability. Fighting Tauri+Playwright for a thinner EXE is false economy.

---

## Research Methodology

- **Sources consulted:** 5 web searches + repo (`cli/`, README, prior headed-display research) + training cross-check (Electron/Tauri/Wails maturity)
- **Date range of materials:** Playwright / Electron / Tauri v2 docs and issues ~2021–2026; electron-builder target docs current; prior internal research 2026-08-11
- **Key search terms:** electron-builder NSIS MSI Squirrel auto-update; Tauri 2 sidecar Node Windows; Playwright launchPersistentContext channel chrome SingletonLock; Electron utilityProcess IPC; Playwright browsers path Electron bundle size
- **Credibility weighting:** Official Playwright / Electron / Tauri / electron-builder docs > GitHub maintainer issues > secondary blogs (QASkills size notes used only for order-of-magnitude)
- **Hard limit:** exactly 5 web_search calls; no further fetches

---

## Key Findings

### 1. Technology Overview

| Option | What it is | Fit for Node/Playwright scanner |
|--------|------------|----------------------------------|
| **Electron** | Chromium + Node shell; UI in HTML/TS | **Best.** Same language; spawn CLI; IPC mature |
| **Tauri 2** | Rust core + system WebView; optional sidecars | Possible via Node sidecar, **high ops cost** |
| **Wails** | Go + WebView | Wrong language; rewrites engine |
| **Neutralino / NW.js** | Lightweight / older Node+Chromium | Underpowered or outdated for this ops model |
| **No GUI framework** | NSIS + portable Node + batch | Possible but poor “live status” UX for non-devs |

**Architecture that honors YAGNI (reuse CLI):**

```text
┌─────────────────────────────────────────────┐
│  Electron (thin UI)                         │
│  - Start / Resume / Stop                    │
│  - Progress from progress.json + jsonl tail │
│  - Open Chrome window is Playwright’s job   │
│  - Export = copy/open results.csv           │
└──────────────────┬──────────────────────────┘
                   │ child_process.spawn
                   ▼
┌─────────────────────────────────────────────┐
│  Existing CLI (tsx/bundled entry)           │
│  npm run scan → cli/index.ts                │
│  --resume --scan-profile --out …            │
└──────────────────┬──────────────────────────┘
                   │ Playwright
                   ▼
┌─────────────────────────────────────────────┐
│  System Google Chrome (channel: 'chrome')   │
│  Dedicated userDataDir (NOT Default profile)│
│  Headed → human passes CF once              │
└─────────────────────────────────────────────┘
```

**Alternatives rejected for MVP**

- Rewrite scanner inside Electron main/`utilityProcess`: duplicates CLI resume/CSV; more crash surface.
- Tauri UI + `pkg` sidecar: official path exists ([Node.js as a sidecar](https://v2.tauri.app/learn/sidecar-nodejs/)) but adds Rust toolchain, target-triple naming, capability ACLs, and Playwright native binary path hell for non-devs.
- Bundle Playwright Chromium: +~170–600 MB; worse CF fingerprint vs branded Chrome; CLI already prefers system Chrome.

### 2. Current State & Trends (Windows packaging, 2025–2026)

- **electron-builder** still default distribution path for consumer Windows apps: targets NSIS, nsis-web, portable, MSI, MSIX/AppX, Squirrel.
- **NSIS = recommended consumer target**; works with **electron-updater**.
- **Squirrel.Windows:** still buildable but **not supported** by electron-builder’s simplified auto-update — migrate to NSIS.
- **MSI:** enterprise SCCM/Intune; **no** native electron-updater; use `msi-wrapped` if need both.
- **Code signing + SmartScreen:** unsigned Electron NSIS = scary warnings for non-devs; treat signing as ship-blocker for “customers,” not for internal MVP.
- **Tauri 2** mature for greenfield Rust/TS apps; sidecar Node is documented but not the happy path for Playwright-heavy products.
- **Playwright:** `channel: 'chrome' | 'msedge'` official; persistent context docs warn: **no multi-instance same userDataDir**; **do not automate Chrome’s default User Data**.

**Repo alignment:** CLI already has resume, `progress.json`, simple CSV, headed + `--scan-profile`, Linux `--virtual-display`. Windows MVP drops Xvfb (native headed display); keep HITL on real desktop.

### 3. Best Practices

**Process model**

1. **Thin Electron UI** owns windows, file pickers, “Chrome installed?” check.
2. **Spawn CLI** as child (or `utilityProcess` only if you later inline worker). Prefer **spawn packaged CLI entry** so resume/CSV stay single source of truth.
3. **Progress IPC:** prefer **filesystem artefacts** already written (`progress.json`, `results.jsonl`) + optional stdout line protocol. Poll 500–1000 ms or `fs.watch`. Avoid rewriting orchestrator for fancy MessagePort early.
4. **`utilityProcess`:** good for CPU workers inside Electron ([Electron utilityProcess](https://electronjs.org/docs/latest/api/utility-process)); optional later. Playwright + headed Chrome is already a separate OS process tree — spawning CLI is enough.
5. **Throttle UI updates** (jsonl can grow for 10k rows); show counts + last N rows, not full table every tick.
6. **Stop:** SIGINT/taskkill tree carefully; always leave `--resume`-safe disk state (CLI already designed for this).
7. **Browsers:** MVP = **require Google Chrome installed**; use `channel: 'chrome'`. Set `PLAYWRIGHT_BROWSERS_PATH` only if you later ship fallback Chromium; default skip download with `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` in installer build if channel-only.
8. **Profile path (Windows):** e.g. `%LOCALAPPDATA%\affiliate-partner-finder\chrome-profile` — dedicated dir, never `%LOCALAPPDATA%\Google\Chrome\User Data`.
9. **Out dir:** `%USERPROFILE%\Documents\AffiliatePartnerFinder\runs\<id>\` or user-chosen folder — easy to find CSV.
10. **One Chrome profile lock:** enforce single active scan job in GUI (disable Start if job running).

**Packaging size / ops**

| Strategy | Installer size (order) | Ops |
|----------|------------------------|-----|
| Electron + CLI + **no** bundled browser | ~150–250 MB typical Electron app | Require Chrome; smallest sane path |
| + Playwright Chromium fallback | +~400–600 MB | Self-contained; worse CF |
| Tauri + Node sidecar + no browser | Smaller shell, still large sidecar | Two toolchains |

### 4. Security Considerations

- **No CAPTCHA/CF bypass** — product ethics already: human solves once in visible Chrome; cookies in dedicated profile. GUI must not add “solver” services.
- **Sandbox:** keep Electron `contextIsolation: true`, no `nodeIntegration` in renderer; preload bridge only for start/stop/paths.
- **Local-only / privacy:** no telemetry required for MVP; scan data + profile stay on disk. Document paths clearly.
- **Profile isolation:** dedicated automation profile only (Playwright + Chrome policy: default profile automation unsupported / fragile).
- **Shell injection:** pass CLI args as argv array, never concatenate user paths into a shell string.
- **Updates:** if auto-update later, verify signatures (`electron-updater` + Authenticode).
- **AV / SmartScreen:** Electron + NSIS often flagged when **unsigned**; expect false positives; sign early for customer builds.
- **Privilege:** prefer **per-user NSIS** (no admin) so non-devs install without IT.

### 5. Performance Insights

- **Memory:** Electron UI ~100–200+ MB RSS + **headed Chrome** (collect/scan profile) often **500 MB–2+ GB** with concurrency 2–3 and many tabs/pages. Multi-hour runs: disk (jsonl) not RAM is the growth vector if UI tails smartly.
- **GUI must not block:** never run Playwright in renderer; don’t parse entire jsonl into DOM every second.
- **Concurrency:** keep CLI defaults (≤3); GUI expose slider carefully — more concurrency = more CF risk + RAM.
- **Headed on Windows:** native display works; no Xvfb. Trade-off: Chrome windows steal focus — acceptable for CF HITL product; optional later “minimize after CF passed” UX, not MVP.
- **Disk:** 10k run artefacts already large; put `out` on fast local disk; warn against network drives.

---

## Comparative Analysis

| Criterion | Electron + CLI spawn | Tauri 2 + Node sidecar | Wails | Portable Node + NSIS (no Electron) |
|-----------|----------------------|------------------------|-------|--------------------------------------|
| Windows install UX | Excellent (NSIS) | Good (Tauri bundler) | Good | OK; weaker polished UI |
| Headed Chrome / CF HITL | Native via Playwright | Same if sidecar works | Must reimplement | Same CLI |
| Packaging size | Larger shell | Smaller shell, sidecar still heavy | Medium | Smallest |
| Ops complexity | Low–medium (TS only) | **High** (Rust+pkg+caps) | High (Go rewrite) | Medium |
| Fit existing Node/TS/PW | **Best** | Forced sidecar | Poor | Best engine, weak GUI |
| Local-only privacy | Easy | Easy | Easy | Easy |
| Maturity / small team 2025–26 | **Highest** | High for Rust teams | Medium | Medium |
| Multi-hour progress UI | IPC + file watch | Shell events + files | Custom | Console only |
| Auto-update | NSIS + electron-updater | Tauri updater | Possible | Manual |
| **Score for this product** | **1st** | 2nd (later if size critical) | Reject | Reject as primary |

**Trade-off matrix (summary)**

| | Performance | Complexity | Maintenance | Cost (team time) |
|--|-------------|------------|-------------|------------------|
| Electron+CLI | Adequate | Low | Low | Lowest |
| Tauri+sidecar | Slightly leaner UI | High | High | Highest early |
| Bundle Chromium | Worse disk | Medium | Medium | Installer CDN cost |
| System Chrome only | Best CF / size | Low | Low | Support “install Chrome” tickets |

**Adoption risk**

- Electron: huge community; AV noise; Chromium CVE cadence — mitigated by updater later.
- Tauri sidecar+Playwright: abandonment risk low for Tauri, but **your** glue code is bespoke and brittle.
- `pkg`/SEA for sidecar: historical footguns with native modules (Playwright driver).

---

## Implementation Recommendations

### Ranked choice

1. **MVP: Electron + electron-builder NSIS + spawn existing CLI** (channel Chrome, dedicated profile, resume, CSV).
2. **P1 after first paying users:** Authenticode signing + optional `electron-updater`.
3. **P2:** polished progress UI (ETA, CF pause banner), crash recovery tips for SingletonLock.
4. **Not now:** Tauri migration, bundling Chromium, MSI, Squirrel, rewriting CLI into utilityProcess.

### Quick Start Guide (Windows MVP outline — no code)

1. **Scaffold** `desktop/` Electron app (Forge or vite-electron template); renderer: Start / Resume / Open out folder / Export CSV.
2. **Wire spawn:** package CLI entry (esbuild/tsx bundle or ship `node` + `cli` + `lib`); `spawn(cli, ['--query', …, '--out', out, '--scan-profile', '--accept-failures', …])`.
3. **Progress:** watch `out/progress.json` + append reads of `results.jsonl`; map to UI counts; on exit open/copy `results.csv` (`ket_qua`).
4. **Chrome gate:** on launch, detect Chrome path; if missing, modal with download link — do not silently fall back without warning (CF quality drop).
5. **Profile:** default `%LOCALAPPDATA%\affiliate-partner-finder\chrome-profile`; document “one scan at a time.”
6. **Builder:** `electron-builder --win nsis`; per-user install; `extraResources` for CLI bundle; **skip** Playwright browser download in CI pack.
7. **Smoke test on clean Win10/11 VM:** install → CF challenge once → kill app → Resume → CSV opens in Excel.
8. **Do not** change running Linux 10k job or shared profile while testing.

### Code Examples

Omitted per scope (research only). Patterns to use later: `child_process.spawn` argv array; Electron `contextBridge`; electron-builder `win.target: nsis`; Playwright `channel: 'chrome'` + dedicated `userDataDir`.

### Common Pitfalls

| Pitfall | Symptom | Mitigation |
|---------|---------|------------|
| **SingletonLock / profile in use** | Launch fail / hang / “Opening in existing browser session” | One job; graceful `browser.close()`; on crash, detect lock + instruct close Chrome / delete Singleton* in **app** profile only |
| Using **default Chrome User Data** | Exit, blank pages, policy blocks | Dedicated automation dir only |
| **Headed focus theft** | User can’t work during scan | Expected for CF product; document; later minimize-after-ready |
| **Xvfb thinking on Windows** | N/A / broken scripts | Windows = real display; keep `--virtual-display` Linux-only |
| **Bundled Chromium path wrong in asar** | Executable doesn’t exist | Don’t asar Playwright; prefer system Chrome; else `PLAYWRIGHT_BROWSERS_PATH` + unpack |
| **Antivirus / SmartScreen** | “Unknown publisher” | Sign builds; reputation warmup; document false positive |
| **Two GUIs / CLI on same profile** | Lock fights | Mutex in Electron; document CLI vs GUI exclusivity |
| **UI loads full 10k jsonl** | Freeze | Stream / aggregate counts |
| **Kill -9 mid-write** | Corrupt progress | Prefer soft stop; rely on CLI atomic writes where present |
| **Linux UA string on Windows Chrome** | Fingerprint mismatch | Fix UA/locale when packaging Windows GUI (separate from this research’s code freeze) |

---

## Resources & References

### Official Documentation

- [electron-builder — Auto Update](https://www.electron.build/docs/features/auto-update/) (NSIS; Squirrel.Windows not supported for simplified updater)
- [electron-builder — Target selection (NSIS/MSI/MSIX)](https://www.electron.build/docs/targets/)
- [Electron — utilityProcess](https://electronjs.org/docs/latest/api/utility-process)
- [Tauri 2 — Node.js as a sidecar](https://v2.tauri.app/learn/sidecar-nodejs/)
- [Tauri 2 — Embedding external binaries](https://v2.tauri.app/develop/sidecar/)
- [Playwright — BrowserType.launchPersistentContext](https://playwright.dev/docs/api/class-browsertype) (`channel`, userDataDir single-instance, no default Chrome profile)

### Community / Issues (pitfalls)

- Playwright issue discussions on persistent context / SingletonLock cleanup (`browser.close()`)
- Windows Chrome “Opening in existing browser session” when same `userDataDir` reused (Playwright MCP / Claude Code issues — pattern applies)
- electron-builder + Playwright browser cache not packing unless `PLAYWRIGHT_BROWSERS_PATH=0` (historical Electron packaging threads)

### Internal (this repo)

- `cli/browser.ts` — `channel: 'chrome'`, persistent profile, headed scan-profile
- `cli/index.ts` — `--resume`, `progress.json`, simple CSV
- `plans/reports/research-260811-2250-headed-virtual-display.md` — Linux Xvfb; Windows MVP does not need it
- README — ethics: no CAPTCHA bypass; CF human once

### Further Reading

- Chrome remote-debugging / profile policy notes (linked from Playwright persistent-context docs)
- Authenticode + SmartScreen reputation for Electron apps (Microsoft docs — not fetched in this pass)

---

## Unresolved Questions

1. Will customers tolerate **install Google Chrome** prerequisite, or is bundled Chromium fallback mandatory for sales?
2. Budget/process for **Authenticode** certificate (blocks “non-scary” install UX)?
3. Should GUI support **Linux/macOS** later, or Windows-only forever? (affects Tauri reconsideration)
4. Is **concurrency >1** with headed CF profile stable enough on low-RAM laptops for the target customer?
5. Product need for **auto-update** in first release vs manual “download new installer”?
6. Should Windows default profile migrate from Linux `~/.cache/...` path scheme for cross-machine doc consistency?
7. Fix Windows-appropriate **User-Agent** in scan contexts before customer GUI ship? (currently Linux-like UA in `cli/browser.ts`)

---

## Appendices

### A. Glossary

| Term | Meaning |
|------|---------|
| NSIS | Nullsoft installer; electron-builder default Windows consumer target |
| channel: chrome | Playwright drives installed Google Chrome |
| userDataDir / persistent profile | On-disk Chrome profile for cookies (CF clearance) |
| SingletonLock | Chromium lock file; one process per profile |
| HITL | Human-in-the-loop (solve CF once) |
| ket_qua | End-user CSV column: true / false / unknown |
| Sidecar | External binary shipped beside Tauri/Electron app |

### B. Version Compatibility Matrix (indicative)

| Component | Repo / market now | MVP note |
|-----------|-------------------|----------|
| Node | 18+ / 20 (`.nvmrc`) | Bundle Node with Electron or ship runtime |
| Playwright | ^1.62.x in repo | Keep in sync with Chrome major when possible |
| Electron | pick current stable LTS-ish | Pin; test headed spawn on Win11 |
| electron-builder | current | `win.target: nsis` |
| Tauri | v2 | Defer |

### C. Raw Research Notes

- Search1: electron-builder → NSIS default + updater; Squirrel unsupported for simplified auto-update; MSI no updater unless msi-wrapped.
- Search2: Tauri Node sidecar via `pkg` + `externalBin` + target triple + shell capabilities — real but heavy.
- Search3: Playwright persistent context — single instance per dir; don’t use default Chrome profile; Windows lock / “existing session” failures common.
- Search4: `utilityProcess` = Node child via Chromium Services; useful later; not required if CLI spawn + file progress.
- Search5: Bundling Playwright browsers inflates installer; `PLAYWRIGHT_BROWSERS_PATH=0` pattern; system Chrome avoids ~400–600 MB.
- Prior art: Linux virtual display research — Windows GUI product should embrace visible Chrome for CF, not headless.

### D. Next steps (actionable)

1. Product decision: Chrome prerequisite vs bundle fallback.
2. Spike (separate from 10k): empty Electron window + spawn `npm run scan -- --limit 3` on a Windows VM; confirm CF window + progress.json.
3. Decide code-signing timeline before external customers.
4. Keep engine changes minimal: path defaults for Windows LocalAppData + UA fix; GUI stays a shell.

---

*End of report. YAGNI: ship Electron shell over CLI; skip Tauri until size/security forces it.*
