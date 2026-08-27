---
type: scout
date: 2026-08-27
---

# Scout: affiliate-partner-finder architecture

## Summary

Three products share one detector core in `lib/`. There is **no `extension/` directory** — the Chrome MV3 surface is WXT `entrypoints/` + `wxt.config.ts`. CLI (`cli/`) is the batch engine (Playwright). Desktop (`desktop/`) is an Electron job workspace that **spawns the CLI**; it does not reimplement scan. End-user CSV (`ten_cong_ty,website,ket_qua,huong_dan`) is a CLI/desktop contract. The extension still exports technical `toCSV()` only.

Current package version: **1.0.10**. Detector version: **1.1.0** (`lib/config.ts`).

## Findings

### Layout (requested dirs)

| Path | Exists | Role |
|------|--------|------|
| `lib/` | yes | Shared schema, detector, classify, export, Trustpilot reader |
| `cli/` | yes | Playwright collect + scan + JSONL/CSV orchestrator |
| `desktop/` | yes | Electron shell: spawn CLI, watch job folder, Vietnamese UI |
| `extension/` | **no** | MV3 lives in `entrypoints/` (popup, options dashboard, empty SW) |

Product truth for the customer window: `PRODUCT.md` (desktop job workspace). Extension-era design truth: `docs/01`–`11`. Operator CLI: `README.md` local-CLI section. Desktop customer docs: `docs/desktop-windows.md`. Visual system: `DESIGN.md` (desktop only).

---

### Module map

#### `lib/` — shared, chrome-optional where noted

| File | Role | Chrome? |
|------|------|---------|
| `types.ts` | `Company`, `ScanResult`, `Evidence`, `Verdict`, `RunConfig`, `Progress` — mirrors `docs/06` | no |
| `config.ts` | Strong/weak keywords, platforms, probe paths, `DETECTOR_VERSION=1.1.0`, `DEFAULT_RUN_CONFIG` | no |
| `collect-pagination.ts` | Limit clamp 1–10000, `maxPagesForLimit`, `nextCollectAction` (WAF/last-page) | no |
| `trustpilot-reader.ts` | Injected `__NEXT_DATA__` reader (self-contained) | no |
| `next-data.ts` | HTML regex extract of `__NEXT_DATA__` (resolve-via-review) | no |
| `collect.ts` | Extension collect: real Trustpilot **tab**, skip known domains, **maxPages default 40** | **yes** (`chrome.tabs`) |
| `resolve.ts` | `https://{domain}` or 12s fetch of review `websiteUrl` | fetch (ext/CLI) |
| `detector.ts` | Layer 1: bot-block heuristic + link-scan + platform host match; injectable | no (injected) |
| `path-probe.ts` | Layer 3: junk baseline + same-origin path fetch; `parallelBatch` 1–3 | no (injected) |
| `probe-batch.ts` | Clamp `--probe-batch-size` 1–3 | no |
| `early-exit.ts` | Skip path-probe when strong link/platform/network already present | no |
| `classify.ts` | Pure decision table (`docs/05` §6). `networkHits` fold as strong | no |
| `export.ts` | `toCSV` (technical), `toSimpleCSV` (end-user), `simpleHit`/`simpleHint` | no |
| `labels.ts` | Vietnamese display labels for extension UI | no |
| `scan.ts` | Extension `scanOne`: background tab + `executeScript` + 700ms settle | **yes** |
| `run-engine.ts` | Extension orchestrator in **options page** (not SW): modes `new`/`refreshStale`/`restart`, session lock | **yes** |
| `storage.ts` | IndexedDB `affiliate-finder` (companies/results/meta) | **yes** (`idb`) |
| `detector-config.ts` | User keyword/path override in `chrome.storage.local` | **yes** |
| `tab-utils.ts` | `waitForComplete` / `closeTab` | **yes** |
| `messages.ts` | `PROGRESS` broadcast + `pendingRun` handoff | **yes** |
| `network-hosts.ts` | Host-boundary platform match + CDN aliases (`dwin1.com`→awin) | no |
| `network-collector.ts` | Deduped URL→platform collector (CLI attaches listeners) | no |

#### `cli/` — Playwright batch

| File | Role |
|------|------|
| `index.ts` | Args, collect→scan→export, SIGINT/`.stop`, JSONL checkpoint, writes `results.csv` + `results.full.csv` + `results.json` |
| `collect.ts` | Persistent headed Chrome profile; `nextCollectAction`; page checkpoints to `companies.json` |
| `scan.ts` | Per-company Playwright scan; optional early-exit / lazy-settle / network-evidence / probe-parallel / profile-timing; incomplete-probe → `timeout` not `none` |
| `browser.ts` | Persistent collect context; scan session (ephemeral or `--scan-profile`); `settleForScan` 1200ms vs lazy ≤1200ms; `closeQuietly` 3s |
| `injectable.ts` | Strip esbuild `__name()` so `fn.toString()` is safe for `page.evaluate` |
| `virtual-display.ts` | Linux: re-exec under `xvfb-run` |
| `hide-chrome-window.ts` | Win/mac: off-screen + minimized headed Chrome |
| `profile-timing.ts` | Opt-in `timingsMs` on `ScanResult` (never end-user CSV) |

Default CLI knobs: concurrency 2 (max 3), delay 1500ms, early-exit/lazy-settle/network-evidence/profile-timing/probe-parallel **OFF**. `--scan-profile` implies headed. `--virtual-display` default **OFF** on CLI, **ON** from desktop.

#### `desktop/` — Electron adapter (does not scan)

| File | Role |
|------|------|
| `main.ts` | Single-instance app; IPC start/stop/list-runs/open-csv; `ELECTRON_RUN_AS_NODE` spawn |
| `build-scan-argv.ts` | Array-safe argv; always `--scan-profile --accept-failures`; `--virtual-display` unless explicitly off |
| `job-supervisor.ts` | Spawn CLI, poll `progress.json`+`results.jsonl`, ETA, Stop via `.stop`+SIGINT, fallback `writeSimpleCsvFromJsonl` |
| `types.ts` | `JobOptions` / `JobStatus` / `ProgressSnapshot` |
| `progress.ts` | Path jail (runs/profile roots); forbid personal Chrome User Data; `canStartFresh` |
| `job-lock.ts` | `.job.lock` per out dir |
| `ket-qua-counts.ts` | Count `simpleHit` from JSONL; Stop-path CSV |
| `eta.ts` | Rolling ETA; hide if stalled >8 min |
| `format.ts` | Progress/count strings |
| `preload.cjs` | IPC bridge |
| `electron-dev.cjs` | Dev entry |
| `electron-builder.yml` | NSIS / AppImage / deb |
| `renderer/` | Vietnamese job workspace (`index.html`, `app.js`, `styles.css`) |

#### Extension (`entrypoints/` + WXT) — not `extension/`

| File | Role |
|------|------|
| `wxt.config.ts` | MV3 name/version **1.0.0** (stale vs package 1.0.10); perms `tabs,scripting,storage,notifications`; hosts Trustpilot + `<all_urls>` |
| `entrypoints/background.ts` | **Empty on purpose** — SW lifetime killed long runs |
| `entrypoints/popup/` | Launcher: write `pendingRun`, open options; glance table; export **technical** CSV/JSON |
| `entrypoints/options/` | **Owns the loop** via `runScan`; results table + detector config editor; export **technical** CSV/JSON |

---

### Data flow: scan → CSV

```
query + limit
    │
    ├─ Extension: options page runScan()
    │     collect()  ── chrome tab Trustpilot /search?page=N
    │     skip domains already in IndexedDB
    │     saveCompanies → idb
    │
    └─ CLI / Desktop: cli/index.ts
          collectCli() ── Playwright persistent profile
          checkpoint companies.json per page
          WAF retry + maxPagesForLimit(limit)  (10k → 1000 pages)
          desktop: JobSupervisor spawn + progress.json phase=collect

resolve(domain)
    default https://{domain}
    optional review-page websiteUrl (extension checkbox; CLI DEFAULT false)

scan one site
    Extension lib/scan.ts:
      chrome.tabs.create(active:false) → wait complete 20s
      sleep(700)
      executeScript(runDetector)
      if ok: executeScript(pathProbe) sequential
      classify()  — no networkHits, no early-exit
      saveResult → IndexedDB
      delay 2s, concurrency 1

    CLI cli/scan.ts:
      page.goto(domcontentloaded, 20s)
      settle 1200ms XOR lazy-settle ≤1200ms
      evaluateInjectable(runDetector)
      optional NetworkHostCollector (request/response, no page.route)
      optional skip path-probe (--early-exit)
      pathProbe(..., timeout 8s, parallelBatch 1|3)
      incomplete probe + no homepage signal → loadStatus=timeout
      classify(+ networkHits if flag)
      append results.jsonl (fsync), progress.json phase=scan
      concurrency 1–3 via p-limit, start stagger

classify (shared lib/classify.ts)
    loadStatus != ok     → unknown / blocked     NEVER none
    strong link|platform|network → affiliate high
    strong path (affiliat)       → affiliate medium
    weak link ∧ weak path        → partner_trade medium
    weak only                    → partner_trade low
    else                         → none high

simpleHit (lib/export.ts) — end-user ket_qua
    loadStatus != ok → unknown
    any link/platform/network/path hit → true
    else → false
    (affiliate AND partner_trade both become true)

export
    CLI end of job (also after Stop once in-flight scans finish):
      results.csv       = toSimpleCSV  ten_cong_ty,website,ket_qua,huong_dan
      results.full.csv  = toCSV        docs/06 technical columns
      results.json      = ScanResult[]
    Desktop Stop if CLI did not write csv:
      writeSimpleCsvFromJsonl → results.csv only (no full.csv/json)
    Extension popup/options:
      download toCSV + toJSON  — NO toSimpleCSV
```

Job folder artefacts (CLI/desktop): `companies.json`, `results.jsonl`, `progress.json`, `results.csv`, `results.full.csv`, `results.json`, `.stop`, `.job.lock`.

---

### Shared lib usage

| Capability | Extension | CLI | Desktop |
|------------|-----------|-----|---------|
| `classify` / `detector` / `path-probe` | yes | yes (via evaluateInjectable) | via CLI |
| `export.toSimpleCSV` | **no** | yes | yes (supervisor + Open CSV) |
| `export.toCSV` | yes (download) | `results.full.csv` | not opened by UI |
| `collect-pagination.nextCollectAction` | **no** (`lib/collect.ts` own loop) | yes | via CLI |
| `early-exit` / network / lazy-settle / probe-parallel | **no** | flags, default off | UI checkboxes, default off |
| `profile-timing` | no | flag | **not wired** in `JobOptions` / IPC |
| `detector-config` overrides | yes (dashboard) | hardcoded `CONFIG` | hardcoded `CONFIG` |
| `storage.ts` IndexedDB | yes | no | no |
| `resolveViaReviewPage` | UI checkbox | `DEFAULT_RUN_CONFIG` false | not exposed |
| Chrome profile | user's Chrome session | `~/.cache/.../chrome-profile` or `--profile` | app-owned profile root |

---

### Parity gaps (extension vs CLI vs desktop)

**P1 — CSV contract split (product vs extension)**  
`PRODUCT.md` / desktop / CLI primary deliverable is `ket_qua` true/false/unknown. Extension exports `verdict` affiliate/partner_trade/none/unknown. Same `simpleHit` exists in lib but extension never calls it. HITL CSV from popup is not the customer CSV.

**P2 — Collect scale**  
CLI uses `maxPagesForLimit` + WAF retries + distrust of `totalPages` unless page looks like a tail (`FULL_SEARCH_PAGE_UNITS=8`). Extension `lib/collect.ts` hard-caps **40 pages**, stops when `currentPage >= totalPages` (the heuristic CLI explicitly abandoned for 10k). Extension cannot collect 10k.

**P3 — Scan throughput / evidence layers**  
Extension: 1 tab, 700ms settle, always sequential path-probe, no network layer, no early-exit, no 120s scan budget, no incomplete-probe→timeout guard. CLI: 2–3 parallel pages, 1200ms settle, optional network/early-exit/probe-parallel, 120s wall, probe-timeout treated as unknown. Same classify function, different evidence inputs → possible verdict drift on the same domain.

**P4 — Persistence / resume**  
Extension: one IndexedDB; modes new/refreshStale/restart; **dashboard tab must stay open**. CLI/desktop: per-job folder; `--resume` from `companies.json`+jsonl; desktop forbids Start into a folder that already has `companies.json`. No shared job identity across extension and desktop.

**P5 — Orchestration docs are stale**  
`README.md` structure still lists `entrypoints/background.ts` as orchestrator. `docs/04` §1–7 describe SW queue; §8 records the v1.1 dashboard move. `docs/08` and `docs/11` still say SW orchestrator + `alarms`. `wxt.config.ts` version **1.0.0** vs `package.json` **1.0.10**. `docs/06` §4 technical CSV; never documents `toSimpleCSV`. `USAGE_STEPS` in `lib/labels.ts` still says closing the popup keeps the run in the background — false unless the options tab stays open.

**P6 — Desktop vs CLI flag surface**  
Desktop always passes `--scan-profile --accept-failures`; CLI those default false. Desktop `--virtual-display` default ON; CLI OFF. Desktop IPC does not expose `--profile-timing`, `--delay-ms`, `--headed-scan`, `--probe-batch-size` (only `--probe-parallel` → batch 3). `resolveViaReviewPage` not on desktop.

**P7 — Detector config**  
Only extension dashboard can edit keywords/platforms/paths (survives restart via `chrome.storage.local`). CLI/desktop always ship `CONFIG`. Changing lists in the extension does not affect desktop jobs.

**P8 — Ethics concurrency**  
`docs/08` §6: max 1 scan tab. Extension still 1. CLI/desktop 2 default, 3 with “Tăng tốc”. README acknowledges the split.

**P9 — Stop / CSV completeness**  
CLI Stop exports unique-by-domain from map after in-flight work. Desktop `writeSimpleCsvFromJsonl` dumps Map values (not company-list order). If CLI already wrote CSV, desktop does not rewrite. Header-only CSV is avoided when the job failed with no jsonl.

**P10 — Product surface vs docs/01**  
`docs/01` personas/scope are extension-first (popup table, evidence click). `PRODUCT.md` (2026-08-26) says the customer is the **desktop window**, no in-app results table, Vietnamese-only, jobs-as-folders. Extension remains a separate product; this rebuild did not retire it.

---

### Docs inventory (`docs/`)

| File | Authority today |
|------|-----------------|
| `01`–`03`, `05` | Detector/Trustpilot findings still load-bearing |
| `04` | Architecture: §8 (dashboard engine) current; §1–7 historical |
| `06` | Internal `ScanResult` schema current; CSV §4 incomplete vs simple CSV |
| `07` | Golden / test plan (extension-era) |
| `08`, `09`, `11` | Scaffold — SW-centric, do not match tree |
| `10` | v2 AI roadmap (out of current product) |
| `desktop-windows.md` | Current desktop customer/operator doc (v1.0.10) |
| `README.md` (docs) | Pipeline 4 stages still correct; “why extension not CLI” superseded by CLI+desktop |

## Recommendations

1. Treat **CLI+desktop** as the customer pipeline; treat **extension** as a parallel MV3 tool with a different export and collect cap — do not assume parity.
2. If one CSV is required: wire `toSimpleCSV` into popup/options, or document two export SKUs.
3. If extension collect should match CLI 10k behavior: reuse `nextCollectAction` + `maxPagesForLimit` in `lib/collect.ts`.
4. Refresh `README` structure, `docs/08`/`11`, and `wxt` manifest version so scouts stop trusting SW-as-orchestrator.
5. Desktop `profile-timing` is the only Track S measurement flag not mirrored in IPC — only matters if GUI jobs must emit `timingsMs`.

## Unresolved questions

- Is the Chrome extension still a supported customer surface, or operator-only leftover? `PRODUCT.md` says “extension popup exists separately; this work is the desktop window only.”
- Should incomplete path-probe (`timeout` instead of `none`) be ported to `lib/scan.ts`? Today only CLI has that guard.
- `lib/detector.ts` in-page `isPlatformHost` is duplicated conceptually with `lib/network-hosts.ts` — not verified identical in this pass.
- Golden set / 10k shard status not in this scout (sibling jobs: `scout-scan-pipeline`, `scout-data-artifacts`).
- Desktop renderer UX (probe-parallel checkbox, workspace selection) deferred to `scout-desktop-ux.md`.
