# Research Report: Electron + electron-builder NSIS MVP (Playwright CLI wrap)

**Research conducted:** 2026-08-12 09:36 (UTC+7)  
**Output:** `plans/reports/research-260812-0936-electron-packaging-mvp.md`  
**Scope:** Actionable Windows packaging for thin Electron shell that **spawns** existing Node/TS Playwright CLI; `extraResources`; skip browser download; system Chrome; unsigned OK for internal MVP.  
**Constraint:** ≤5 web searches; no code commits; YAGNI.  
**Companion:** `plans/reports/research-260812-0932-windows-desktop-gui.md` (product/GUI choice). This doc = **how to package**.

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

**Rank #1: plain `electron-builder` + NSIS.** Scaffold Electron however you like (vite-plugin-electron / electron-vite / bare main). **Do not** adopt Electron Forge as the packaging system for this MVP. Forge’s default Windows maker is Squirrel; first-class NSIS needs a third-party maker (`@felixrieseberg/electron-forge-maker-nsis`). That is extra surface for zero benefit when the only shippable artifact is an internal Windows installer wrapping a CLI.

**Ship shape:** Electron UI in `app.asar` + **pre-bundled CLI JS** (esbuild/tsc → single/few `.js` files) in `extraResources` + `playwright` as a normal Node dependency of that CLI tree (or bundled where safe). Main process `spawn`s **system Node is wrong** — use Electron’s Node via `process.execPath` only for Electron; for the CLI, either (a) **bundle CLI to run under Electron utilityProcess / fork with ELECTRON_RUN_AS_NODE**, or (b) **ship a small Node runtime + CLI under `extraResources`**. For this repo YAGNI: **esbuild-bundle the CLI entry to CJS, put it + `node_modules/playwright*` under `extraResources`, spawn with a shipped `node.exe` OR `ELECTRON_RUN_AS_NODE=1`**. Prefer one path and stick to it (recommendation below).

**Browsers:** `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` at **install/pack time**. Runtime: keep existing `channel: 'chrome'`. Skip ≠ select browser. Without `channel: 'chrome'`, Playwright still expects bundled Chromium and will fail hard.

**Signing:** optional for **internal** MVP. Expect SmartScreen “Unknown publisher.” Document “More info → Run anyway.” Force signing before external customers. Do not block week-1 packaging on cert procurement.

**Brutal bottom line:** Forge and fancy Vite Electron plugins optimize DX. You need an NSIS `.exe` that starts a child scanner. `electron-builder` `win.target: nsis` + `extraResources` + esbuild CLI + skip browser download is the shortest path. Anything else is ceremony.

---

## Research Methodology

- **Sources consulted:** 5 web searches + official electron-builder / Playwright / signing docs (fetched snippets) + companion GUI research + repo `package.json` (WXT + TS + Playwright CLI via `tsx`)
- **Date range:** Playwright install docs (current); electron-builder config & Windows signing docs (current); Forge/NSIS maker npm; community packaging guides ~2024–2026; StackOverflow fork/`extraResources` pitfalls
- **Key search terms:** electron-builder NSIS extraResources spawn; Forge vs vite-plugin-electron vs electron-builder; PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD channel chrome; esbuild TypeScript Node CLI without tsx; Windows unsigned SmartScreen electron-builder
- **Credibility:** Official electron-builder + Playwright docs > maintainer npm packages > production blog posts > Medium how-tos
- **Hard limit:** 5 web_search calls (exhausted)

---

## Key Findings

### 1. Technology Overview — what you are packaging

```text
NSIS installer
└── app/
    ├── AffiliatePartnerFinder.exe     # Electron shell (UI only)
    └── resources/
        ├── app.asar                   # main + preload + renderer
        └── cli/                       # extraResources (NOT inside asar if spawn/fork fragile)
            ├── index.js               # esbuild output (no tsx)
            ├── package.json           # playwright deps if not fully bundled
            └── node_modules/          # playwright (+ deps); NO browser cache
                    └── (spawn) ──────► system Google Chrome (channel: 'chrome')
```

| Piece | Rule |
|-------|------|
| UI | Electron; contextIsolation; thin IPC |
| Scanner | Existing CLI semantics; **one** entry binary/script |
| Runtime TS | **Forbidden** in packaged app (`tsx`/`ts-node` = ship-stopper) |
| Browser binaries | **Not shipped**; env skip at npm install/CI |
| Chrome | Required on machine; first-run gate in UI |

### 2. Current State & Trends (2025–2026)

| Tool | Role | Notes |
|------|------|--------|
| **electron-builder** 26.x (stable) | Packaging + NSIS + updater | Still most downloaded; v27 alpha (ESM, Node 22.12+) — **pin 26.x for MVP** |
| **Electron Forge** | Official all-in-one | Default Windows = Squirrel; NSIS via community maker |
| **vite-plugin-electron** / **electron-vite** | Dev HMR for main/preload/renderer | Does **not** replace a packager; pair with builder |
| **vite-plugin-electron-builder** | Vite plugin wrapping builder options | Convenience layer; still electron-builder under the hood |
| **Playwright** | Skip download env + `channel: 'chrome'` | Official; skip and channel are independent |

**Trend that matters:** teams that care about HMR use vite/electron-vite for **dev**, then **electron-builder** for **dist**. Forge wins greenfield “blessed” monorepos; loses when you already know you want NSIS + `extraResources` + custom child layout.

### 3. Best Practices (actionable)

**A. Packaging toolchain**

1. Use **`electron-builder --win nsis`** as the only ship command for MVP.
2. Prefer **per-user** NSIS (`oneClick` or `allowToChangeInstallationDirectory` + not forcing admin) so non-devs install without IT.
3. Put CLI under **`extraResources`** so it lands in `process.resourcesPath` **outside** asar (spawn/fork/`require` of native-adjacent trees are less painful).
4. Resolve child path as `path.join(process.resourcesPath, 'cli', 'index.js')` — never `__dirname` of source tree in prod.
5. Pass argv as **array** (`spawn(exe, args, { shell: false })`). No string concat of user paths.
6. Kill process **tree** on Stop (Windows: `taskkill /T` or `tree-kill`); leave disk state resume-safe.

**B. CLI without `tsx`**

1. Add production build: `esbuild cli/index.ts --bundle --platform=node --format=cjs --outfile=dist-cli/index.js` (externalize only what must stay external: typically native addons; Playwright driver often kept external via `node_modules` copy).
2. Alternative YAGNI: `tsc` emit to `dist-cli/` + copy `package.json` + `npm ci --omit=dev` with skip-browser env — heavier but simpler mentally.
3. **Do not** ship `tsx`. Dev script may keep `tsx`; pack script must not.
4. Smoke: run `node dist-cli/index.js --help` on clean machine **before** Electron wrap.

**C. Playwright browsers**

1. CI/local pack: `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` (Windows cmd: `set PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`).
2. Also set in any `npm install` that runs **inside** electron-builder’s dependency graph for the CLI resource tree.
3. Runtime launch options: **`channel: 'chrome'`** (already in repo `cli/browser.ts`). Optional `executablePath` only if Chrome nonstandard.
4. First-run UI: detect Chrome; if missing → modal + link. Do not download Chromium as silent fallback in MVP (size + CF fingerprint).
5. Profile: dedicated dir under `%LOCALAPPDATA%\…`; never Default Chrome profile; one scan at a time (SingletonLock).

**D. Code signing**

| Audience | Signing |
|----------|---------|
| Internal / dogfood | **Skip.** `signAndEditExecutable: false` / no CSC env. Document SmartScreen. |
| External customers | **Required.** OV/Azure Trusted Signing; later `forceCodeSigning: true` in release CI. |

electron-builder **silently ships unsigned** if no credentials — fine for MVP, dangerous for “production” if you forget. Use `forceCodeSigning` only when you intend to enforce.

### 4. Security Considerations

- Renderer: no Node; preload whitelist only start/stop/paths.
- Argv array spawn — shell injection.
- Unsigned EXE: train users; prefer internal share (SMB/Teams) over random web download to reduce SmartScreen aggression.
- Do not elevate NSIS to admin unless writing Program Files is required; per-user `%LOCALAPPDATA%` install is safer.
- Later updater must verify Authenticode (`verifyUpdateCodeSignature`).

### 5. Performance / size insights

| Strategy | Approx installer impact | Verdict |
|----------|-------------------------|---------|
| Electron + CLI + skip browsers | ~150–250 MB class | **MVP** |
| + Playwright Chromium | + hundreds of MB | Reject for MVP |
| Forge + Squirrel | Similar size, worse target fit | Reject |
| Full monorepo `files: **` dump | Bloated + secrets risk | Reject — whitelist files |

Headed Chrome dominates RAM; packaging choice does not fix that.

---

## Comparative Analysis

### Forge vs vite-plugin-electron vs plain electron-builder

| Dimension | Electron Forge | vite-plugin-electron / electron-vite | Plain electron-builder |
|-----------|----------------|--------------------------------------|-------------------------|
| Official blessing | Highest | Community / electron-vite docs | De-facto industry packager |
| NSIS | Not default; community maker | Via builder options / paired builder | **First-class** |
| Config mental model | `forge.config` + makers/plugins | Vite plugins + builderOptions | `build` in package.json / yml |
| Dev HMR | Good (Vite/Webpack plugins) | **Best** | None (bring your own) |
| `extraResources` child CLI | Possible via packagerConfig | Possible | **Documented, common** |
| Auto-update | Publishers + optional electron-updater via maker | Via builder | **electron-updater** native story |
| Complexity for this MVP | High (wrong default maker) | Medium (if you need Vite UI) | **Lowest for ship** |
| Adoption risk | Low (Electron team) | Medium (plugin churn) | Low; pin 26.x; watch v27 |
| **Score for affiliate-partner-finder Windows MVP** | 3rd | 2nd (dev only) | **1st** |

**Trade-off matrix**

| Option | Perf | Complexity | Maintenance | Cost (time) | Architectural fit |
|--------|------|------------|-------------|-------------|-------------------|
| **electron-builder NSIS** | Adeq. | Low | Low | Lowest | Best — matches spawn+extraResources |
| electron-vite + builder | Adeq. | Med | Med | Low–med | Good if UI is Vite React/Vue |
| vite-plugin-electron(-builder) | Adeq. | Med | Med (plugin) | Med | OK; still builder |
| Forge + Squirrel | Adeq. | Med | Med | Med | Poor — wrong Windows target |
| Forge + community NSIS maker | Adeq. | High | Higher | Highest | Acceptable later, not MVP |

**Ranked recommendation**

1. **`electron-builder` + NSIS** — ship path.
2. **Optional:** electron-vite / vite-plugin-electron **for local DX only**; call builder for `dist`.
3. **Forge** — skip unless team standardizes on Forge org-wide later.

### Spawn model trade-offs

| Approach | Pros | Cons | MVP? |
|----------|------|------|------|
| `extraResources` + `spawn(node, [cli.js, ...])` with **shipped node.exe** | Clear process isolation; matches “CLI is CLI” | Extra binary; license/size | **Yes** if ELECTRON_RUN_AS_NODE quirks bite |
| `ELECTRON_RUN_AS_NODE=1` + `spawn(process.execPath, [cli.js, ...])` | No second Node | Env footguns; some native modules hate Electron’s Node | **Yes** — try first |
| `utilityProcess` / `fork` of script inside asar | Cleaner Electron API | asar + fork historically broken; Playwright headed odd | Later |
| Rewrite CLI inside main | One process | Violates DRY; resume/CSV drift | **No** |

Community evidence: `fork` of scripts only in `extraResources` often fails under installed NSIS if paths/`execPath` wrong; prefer explicit `spawn` + `resourcesPath`.

---

## Implementation Recommendations

### Ranked choice (packaging)

1. **MVP:** electron-builder NSIS + `extraResources` CLI (esbuild, no tsx) + `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` + `channel: 'chrome'` + unsigned.
2. **DX optional:** electron-vite or vite-plugin-electron for UI HMR — not a second packager.
3. **P1 external:** Authenticode (Azure Trusted Signing or OV PFX) + `forceCodeSigning` on release workflow.
4. **Not now:** Forge, Squirrel, MSI, bundling Chromium, auto-update, Tauri.

### Quick Start Guide (pack steps — do in order)

1. **Create `desktop/`** (or `electron/`) with main/preload/renderer. Minimal window: Start / Resume / Open out / log pane.
2. **CLI production build script**
   - Input: existing `cli/index.ts` (+ deps).
   - Output: `dist-cli/index.js` via **esbuild** (CJS, `platform: node`).
   - Confirm: `node dist-cli/index.js --help` works without `tsx`.
3. **Playwright install policy**
   - Document in README/CI: `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` before any install that feeds the packaged tree.
   - Keep runtime `channel: 'chrome'` (do not remove).
4. **electron-builder config (conceptual)**
   - `win.target: [{ target: 'nsis', arch: ['x64'] }]`
   - `nsis`: per-user friendly; `runAfterFinish` optional.
   - `extraResources`: `{ from: 'dist-cli', to: 'cli' }` (+ ensure `playwright` node_modules present if external).
   - `files`: only Electron UI build output — do **not** pack whole monorepo / WXT extension junk.
   - Signing: omit CSC_* ; set `signAndEditExecutable: false` if builder tries and fails.
5. **Main process spawn**
   - `cliJs = path.join(process.resourcesPath, 'cli', 'index.js')`
   - Prefer try: `env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }`, `spawn(process.execPath, [cliJs, ...argv])`
   - Fallback: ship `node.exe` next to CLI and spawn that.
   - `cwd` / `--out` → user-writable folder (`Documents\…` or picker).
   - Profile → `%LOCALAPPDATA%\affiliate-partner-finder\chrome-profile`.
6. **Progress**
   - Watch `progress.json` / tail `results.jsonl` — do not invent IPC protocol in MVP.
7. **Build**
   - `npm run build:cli && npm run build:desktop && electron-builder --win --x64`
   - Also test `--dir` (unpacked) before NSIS to debug paths faster.
8. **Smoke on clean Win10/11 VM**
   - Install unsigned → SmartScreen → Run anyway.
   - No Chrome → clear error.
   - With Chrome → short scan → CF once → kill → Resume → CSV.
9. **Do not** touch running Linux 10k jobs or shared profiles while packaging tests.

### Code Examples (patterns only)

```js
// electron-builder (package.json "build" or electron-builder.yml) — shape only
{
  "appId": "com.example.affiliate-partner-finder",
  "directories": { "output": "release" },
  "files": ["desktop-dist/**/*"],
  "extraResources": [{ "from": "dist-cli", "to": "cli" }],
  "win": { "target": ["nsis"], "signAndEditExecutable": false },
  "nsis": { "oneClick": false, "allowToChangeInstallationDirectory": true }
}
```

```js
// main process — shape only
const cliJs = path.join(process.resourcesPath, 'cli', 'index.js');
const child = spawn(process.execPath, [cliJs, '--query', q, '--out', out, '--scan-profile'], {
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: false, // headed Chrome must be visible for CF
});
```

```bash
# CI / pack machine
set PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
npm ci
npm run build:cli
npx electron-builder --win --x64
```

### Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Ship `tsx` / raw `.ts` | Child fails instantly | esbuild/tsc before pack |
| Skip download but no `channel: 'chrome'` | “Executable doesn't exist” | Keep channel chrome |
| CLI inside asar + fork | Works unpacked, dies after NSIS | `extraResources` + spawn |
| Wrong path (`__dirname` of asar) | ENOENT | `process.resourcesPath` |
| `spawn(..., { shell: true })` with user paths | Injection / quoting hell | argv array, `shell: false` |
| Pack entire repo `files: ["**/*"]` | Huge EXE, WXT noise, secrets | Whitelist UI + CLI outputs |
| Bundle Electron into preload/main esbuild | “Electron failed to install” | `--external:electron` |
| Expect no SmartScreen when unsigned | Users blocked | README “Run anyway”; sign later |
| Multi-scan same profile | SingletonLock / flaky Chrome | One job lock in UI |
| Playwright browsers in CI cache copied into installer | Gigabyte installer | Skip download + don’t copy `~/.cache/ms-playwright` |
| Force Forge “because official” | Squirrel / maker yak-shave | Use builder NSIS |

---

## Resources & References

### Official / primary

- [electron-builder Configuration](https://www.electron.build/docs/configuration/) — `extraResources`, `nsis`
- [electron-builder Windows Code Signing](https://www.electron.build/docs/features/code-signing/code-signing-win/)
- [electron-builder Code Signing overview](https://www.electron.build/docs/features/code-signing/)
- [electron-builder Troubleshooting (SmartScreen)](https://www.electron.build/docs/troubleshooting/)
- [Playwright — Skip browser downloads](https://github.com/microsoft/playwright/blob/main/docs/installation.md) (`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD`)
- [electron-vite Distribution](https://electron-vite.org/guide/distribution) — pairs with builder or Forge

### Secondary

- [@felixrieseberg/electron-forge-maker-nsis](https://www.npmjs.com/package/@felixrieseberg/electron-forge-maker-nsis) — only if forced onto Forge
- OpenReplay packaging comparison (Forge vs builder, 2026 builder 26.x notes)
- FixDevs Forge troubleshooting (Squirrel vs builder NSIS sweet spots)
- StackOverflow: fork fails under NSIS when child not laid out for `resourcesPath`
- Zenn / GitHub issues: unsigned Electron + SmartScreen UX for internal/OSS

### Internal

- `plans/reports/research-260812-0932-windows-desktop-gui.md` — product architecture (Electron + spawn CLI)
- `plans/reports/brainstorm-260812-0931-windows-desktop-gui.md` — requirements
- Repo: CLI via `tsx` today; must leave `tsx` at the packaging boundary

---

## Unresolved Questions

1. **ELECTRON_RUN_AS_NODE vs shipped `node.exe`:** which survives Playwright’s install/driver layout on Windows with this repo’s dependency tree? Decide with one unpacked `--dir` smoke — not by more research.
2. **esbuild: bundle Playwright or external `node_modules`?** Bundling can break Playwright’s browser-type resolution; default to **external playwright + copy node_modules** unless proven otherwise.
3. **Monorepo layout:** put `desktop/` inside this repo vs separate package — ops preference only; packaging rules identical.
4. **Per-user vs per-machine NSIS** for first customer IT environment — unknown; default per-user.
5. **Azure Trusted Signing account** timeline for post-MVP — out of scope until external distribution date exists.

---

## Appendices

### A. Glossary

| Term | Meaning |
|------|---------|
| **NSIS** | Nullsoft Scriptable Install System — default Windows installer from electron-builder |
| **extraResources** | Files copied to `resources/` beside asar; preferred for spawnable CLI |
| **channel: chrome** | Playwright drives installed Google Chrome, not bundled Chromium |
| **PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD** | Install-time env; prevents browser binary fetch |
| **ELECTRON_RUN_AS_NODE** | Run Electron binary as Node to execute a `.js` CLI |
| **OV / EV / Azure Trusted Signing** | Windows Authenticode options; EV/Azure → faster SmartScreen trust |

### B. Version / pin guidance

| Component | MVP guidance |
|-----------|--------------|
| electron-builder | Pin **26.x** stable; defer 27 alpha |
| Electron | Whatever current LTS the template uses; rebuild natives if any |
| Playwright | Keep in sync with existing CLI; never download browsers in pack CI |
| Node for CLI build | Match team CI; packaged runtime = Electron’s Node or shipped Node LTS |

### C. Raw research notes

- Search1: builder `extraResources` → `resources/`; spawn via `process.resourcesPath`; NSIS fork failures when path/exec wrong.
- Search2: builder still best for NSIS; Forge official but Squirrel-default; vite/electron-vite = DX, builder = dist; Forge NSIS = community maker.
- Search3: `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` official; independent from `channel: 'chrome'`; skip alone does not select Chrome.
- Search4: esbuild CJS for main/CLI before builder is current practice; externalize `electron`; empty prod deps trick for monorepos exists but YAGNI unless hoisting breaks builder.
- Search5: unsigned = SmartScreen expected; builder signs only if creds present; `forceCodeSigning` for release CI later; internal MVP may set `signAndEditExecutable: false`.

### D. Next steps (ordered)

1. esbuild CLI → `dist-cli`; prove no-tsx on Windows.
2. Minimal Electron main + spawn + `extraResources`.
3. `electron-builder --win --dir` path debug; then NSIS.
4. Clean VM smoke (Chrome gate + resume + CSV).
5. Document unsigned SmartScreen for internal users.
6. Schedule signing only when distributing outside the team.

---

**Verdict:** Use **plain electron-builder NSIS**. Bundle CLI with **esbuild (no tsx)**. Put CLI in **extraResources**. Set **PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD** at install/pack. Keep **system Chrome via channel**. **Skip code signing** for internal MVP; accept SmartScreen. Forge and vite-plugin-electron are optional DX — not the packaging strategy.
