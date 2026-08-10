# Research Report: Local Playwright CLI batch scanner

Date: 2026-08-10  
Repo: `/home/manhquy/Downloads/affiliate-partner-finder`  
Scope: planning only — patterns, module sharing, CF risk, checkpoint, deps  
Sources: advise-260810-1600, `lib/collect.ts`, docs/03, docs/11, `package.json`/`tsconfig.json`, Playwright concurrency guides (contexts + p-limit)

## Executive Summary

Ship a **single-package Node CLI** (`tsx` + `playwright` + `p-limit`) that imports pure core from `lib/` (detector/classify/path-probe/export/types/config). Use **one Chromium process, concurrency 2–3 contexts, try/finally close**. Checkpoint with **JSONL + progress sidecar** first (no better-sqlite3). Treat Trustpilot collect as **headed / persistent real-browser profile**, not anonymous headless fetch — same reason extension uses a real tab today.

## Ranked recommendations (concrete)

1. **Browser model (best):** `chromium.launchOnce` → `pLimit(2|3)` → per-company `browser.newContext()` → 1 page → `try/finally context.close()`. Reuse browser for whole job; never `launch()` per URL. Tradeoff: shared process die kills job (checkpoint mitigates); vs pool-of-browsers = more RAM, little gain at N≤3.

2. **Concurrency default:** start **`--concurrency 2`**, max 3, plus **`--delay-ms` ≥1000–1500** between navigations to same host class (Trustpilot serial; target sites parallel within limit). Tradeoff: 2×–3× wall-time vs extension serial without torching CF/target sites; unbounded `Promise.all` OOMs and spikes block rate.

3. **Asset policy for site scans:** optional `page.route` abort for image/font/media on **scan contexts only** (speed/RAM). Do **not** block scripts/stylesheets on Trustpilot collect (CF + Next `__NEXT_DATA__` need JS). Tradeoff: faster scans vs rare CSS-hidden links (acceptable if detector still sees DOM after load + path-probe).

4. **Share TS modules (KISS, monorepo-lite — recommended):** stay one npm package; no workspaces yet. Split by purity:
   - **Shared (Node+ext):** `detector`, `path-probe`, `classify`, `export`, `types`, `labels`, `detector-config`, keyword `config` slices with no `chrome`/`idb`.
   - **Extension-only:** `collect` (chrome.tabs), `storage` (idb), `tab-utils`, `run-engine` chrome wiring, entrypoints.
   - **CLI-only:** `cli/` Playwright collect/scan adapters implementing same stage interfaces.
   Add `package.json` `"exports"` for `#core/*` → `./lib/*.ts` (or `./packages/core` later). Dual tsconfig: keep root for WXT; add `tsconfig.cli.json` (`moduleResolution bundler/nodenext`, types `node`, exclude entrypoints). Run CLI via **`tsx`** (no emit) or `tsc -p tsconfig.cli.json` outdir. Tradeoff vs real monorepo: slightly messier chrome-type bleed if someone imports wrong module; win = zero workspace churn matching current WXT layout.

5. **Avoid for v1 share:** publishing `@scope/core`, Turborepo, or duplicating detector into CLI. Port adapters around collect/scan I/O only — advise already forbids rewrite-while-moving.

6. **Trustpilot / Cloudflare risk (critical):** `lib/collect.ts` documents background/extension-page **fetch → CF 403** after early pages; real tab + cookies + JS pass. Docs/03 A3 older “direct fetch 200” is **stale vs current collect**. Playwright **stock headless** is closer to bot fingerprint than extension tab → expect higher `challenged` (title: just a moment / verifying…). Mitigations **without CAPTCHA bypass:**
   - Collect stage: **serial, headed**, prefer `channel: 'chrome'` or **`launchPersistentContext(userDataDir)`** so user can complete CF once; reuse cookies for pagination (`?page=N` same context).
   - Reuse injected reader logic (port `readTrustpilotSearch` + `challenged` retry loop, not raw `request.get`).
   - On persistent challenge → fail stage with clear `unknown`/blocked, never invent companies.
   - Site scans: separate fresh contexts; record blocked≠none (gold-floor).
   Tradeoff: less “fully headless unattended” on cold machines; ethical and accurate. Do **not** add stealth-plugin/CAPTCHA-solver deps (non-goal + arms race + legal/ethics).

7. **Checkpoint (recommended): JSONL result log + `progress.json`.** Append one finished company/result line (`domain` key); on resume skip domains already `status∈{done,skipped}`; fsync/atomic rename progress. Tradeoff: no rich SQL query; single-writer local CLI doesn’t need it. Zero new dep; grep/jq friendly; matches “kill mid-batch → resume” metric.

8. **Defer SQLite (`better-sqlite3`):** only if jobs get multi-process, need indexed retries/status flips, or multi-GB checkpoints. Cost: native compile, Node ABI friction, harder portable npm install beside WXT. If later: WAL mode, `companies(domain PK)`, `results`, `job_meta`; still export CSV/JSON from rows.

9. **Minimal dep delta (fit current stack: WXT ^0.19, Vitest ^2.1, idb ^8, TS ^5.6):**
   | Package | Role | Suggested |
   |---|---|---|
   | `playwright` | browser binary + API | `^1.49`+ (pin latest 1.x at install; run `npx playwright install chromium`) |
   | `p-limit` | bounded concurrency | `^6` (ESM, matches `"type":"module"`) |
   | `tsx` | run CLI TS | `^4` devDep |
   | `@types/node` | CLI tsconfig | matching Node 18+/20 |
   | **skip** | better-sqlite3, cheerio, puppeteer-extra, csv-stringify | reuse `lib/export.ts`; parse `__NEXT_DATA__` in-page; no stealth stack |
   Keep `idb` extension-only; CLI must not depend on IndexedDB.

10. **Golden / accuracy gate:** reuse Vitest + `test/fixtures/golden.ts`; add CLI smoke flag that runs classifier/detector fixtures unchanged after any Playwright I/O swap. Early-exit path-probe only behind golden compare (advise floor: clear-affiliate recall ≥90%, never blocked→none).

11. **Architectural fit score:** Playwright local + shared pure lib + JSONL ≈ advise week path; lowest adoption risk among options that beat 1-tab extension. Puppeteer alternative: similar CF issues, weaker Trace/codegen ecosystem — no reason to switch given Playwright docs maturity for contexts.

12. **Adoption risks:** Playwright browser download size; CF may still block automation on Trustpilot intermittent; robots.txt Disallow `/search` (docs/03) → keep ethics throttle + personal/research use framing, no cloud fleet. Extension remains Collect convenience fallback when CLI persistent profile fails.

## Trade-off matrix

| Option | Throughput | Complexity | Maintenance | CF Collect reliability | Cost |
|---|---|---|---|---|---|
| Ext serial tabs (status quo) | Low | Low | Low | High (real session) | Free |
| CLI Playwright + p-limit 2–3 + persistent collect | Med–High | Med | Med | Med–High if headed/persist | Disk+CPU |
| CLI headless-only fetch | High fragile | Low | Low | Poor (403/challenge) | Low |
| JSONL checkpoint | — | Very low | Very low | N/A | 0 deps |
| better-sqlite3 | — | Med | Med (native) | N/A | install friction |

## Recommendation (ranked)

1. **Do:** single-package CLI + Playwright + p-limit(2) + JSONL resume + extract pure core.  
2. **Do next:** persistent/headed Trustpilot context; measure challenge rate vs extension.  
3. **Don’t yet:** SQLite, monorepo workspaces, stealth/CAPTCHA bypass, cheerio, Electron shell.

## Limitations

- No live CF probe with Playwright in this research session (repo evidence only).  
- Exact Playwright npm version not pinned from registry at write time — install latest 1.x and lockfile.  
- Did not audit every `lib/*` for accidental `chrome` imports beyond collect/storage/tab wiring.

## Unresolved questions

- Should CLI default Trustpilot to `launchPersistentContext` path under `~/.cache/affiliate-partner-finder/chrome-profile`?  
- Is channel Chrome (system) preferred over bundled Chromium for CF pass-rate?  
- Target golden-set size for live smoke under CI-less local gate?

## Sources

- `plans/reports/advise-260810-1600-batch-local-accuracy.md`
- `lib/collect.ts` (CF tab requirement)
- `docs/03-technical-findings.md`, `docs/11-tech-stack.md`
- `package.json`, `tsconfig.json`
- Playwright context isolation / concurrency guides; p-limit + Playwright TS crawl patterns (2025–2026)
