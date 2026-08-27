---
type: scout
date: 2026-08-27
subject: desktop-ux
plan: plans/260826-1909-cli-throughput-track-s/phase-05-desktop-mirror-flags.md
---

# Scout: Desktop UX (Vietnamese customer window)

## Summary

The Electron window is already a two-pane job workspace (list + preview), Vietnamese-first, matching `PRODUCT.md` and `DESIGN.md` more than a stacked form. Phase 5 `--probe-parallel` is mirrored as an **unchecked** checkbox **Quét đường dẫn song song**. Customer-facing holes are copy/docs, not missing chrome: `docs/desktop-windows.md` still omits the new flag; the hint overclaims speed and uses operator jargon; several IPC/dialog strings leak English; the Cloudflare panel is always on; job filter empty-state is broken. English localization remains **undecided** — do not build a catalog.

## Relevant Files

| Path | Role |
|------|------|
| `PRODUCT.md` | Customer-window contract: VN-only, job workspace, must-remain capabilities, English i18n undecided |
| `DESIGN.md` | Linear × Explorer visual canon (mica, 32px controls, pills not hero cards) |
| `desktop/renderer/index.html` | Shell, command bar, settings including `#probeParallel`, CF panel, CSV row |
| `desktop/renderer/app.js` | Status/ETA/counts, `scanOptFlags()`, Start/Resume lock, job table |
| `desktop/renderer/styles.css` | Fluent tokens; CF always visible; 960px stack; no status bar |
| `desktop/main.ts` | Title, 880×640 min, IPC, mixed-language dialogs/errors |
| `desktop/eta.ts` | Vietnamese ETA labels; stalled copy still says `Chrome/CF` |
| `desktop/build-scan-argv.ts` | Emits `--probe-parallel` only when `opts.probeParallel` |
| `desktop/types.ts` | `probeParallel?: boolean` default OFF |
| `desktop/README.md` | Maintainer contract — Track A flags only; **no** probe-parallel |
| `docs/desktop-windows.md` | Customer Windows guide — **missing** Quét đường dẫn song song |
| `docs/01-product-overview.md` | Stale extension-era product story |
| `README.md` | CLI flags; `--probe-parallel` still help-only |
| `test/desktop-electron.e2e.test.ts` | VN shell + hide-chrome default; **no** `#probeParallel` lock |
| `plans/260826-1909-cli-throughput-track-s/phase-05-desktop-mirror-flags.md` | Mirror flag; label was TBD; docs listed as modify |
| `plans/reports/code-review-track-s-phase5.md` | Confirms checkbox default OFF; docs nit still open |

## Job workspace (what shipped)

Matches PRODUCT “jobs are the home surface; selected job is the work surface”:

- Command bar: **Job mới** (primary), **Chọn thư mục…**, **Mở thư mục runs**, filter.
- Left: job table (name, keyword, mini progress, state pill, relative time). Rows keyboard-activable (Enter/Space).
- Right preview: keyword + limit, six scan settings always expanded, Bắt đầu / Tiếp tục / Dừng, live dashboard (`aria-live` + `role="progressbar"`), `results.csv` file row, path + **Mở thư mục job**, Cloudflare caution panel.
- While a scan runs, table stays selectable; Start/Resume lock; Stop always stops the live job; CSV/folder follow **selected** path (`app.js` 405–422, 545–614).
- Window: title **Trình dò Affiliate/Partner**, `lang="vi"`, min 880×640 (`main.ts` 53–58). Visual tokens match `DESIGN.md` (mica `#F3F3F3`, accent `#005FB8`, 6px radius).

Must-remain PRODUCT capabilities are present: keyword + 1–10000, job folder actions, hide-Chrome default on, turbo 3 vs 2, Start/Resume/Stop, live state/phase/fraction/ETA/counts/domains, CF instructions (no bypass copy), Open CSV / Open folder.

## Findings

### 1. Phase 5 `--probe-parallel` (desktop mirror)

End-to-end opt-in is in the window:

| Layer | Evidence |
|-------|----------|
| HTML | `#probeParallel` checkbox, **no** `checked` (`index.html` 168–173) |
| Label | **Quét đường dẫn song song** (phase file said “Vietnamese label TBD” — now decided in UI) |
| Hint | “Mở tối đa 3 đường dẫn affiliate cùng lúc (28 path + junk). Nhanh hơn ~30–40%; mặc định tắt.” |
| Renderer | `scanOptFlags().probeParallel` on Start **and** Resume (`app.js` 523–531, 565, 579). Missing node → `false`. Not in `localStorage` (only last query). |
| Main/argv | `Boolean(opts.probeParallel)` → `--probe-parallel` only if true |

**Customer copy problem (not a default-ON bug):** “28 path + junk” is operator jargon. “~30–40%” is a **directional** A/B figure (`GATE: PASS (directional-throughput)`, n<200), not a customer guarantee. PRODUCT: technical flags in ordinary language; facts must not change.

Phase file still `status: pending` and lists `docs/desktop-windows.md` as a modify target. Code-review phase 5 already marked that doc **MISSING**.

### 2. Customer-facing gaps

| ID | Gap | Evidence | Severity |
|----|-----|----------|----------|
| C1 | Cloudflare panel always visible, even idle | `#cfPanel` has no `hidden` and **no** JS in `app.js` | High (noise; looks like an action is required now) |
| C2 | Job filter: no matches → blank table, empty copy stays hidden | `empty.hidden = cachedRuns.length > 0` (`app.js` 192) ignores `visible` | Medium |
| C3 | Run list capped at 30 newest | `desktop/main.ts` 204 `.slice(0, 30)` | Medium for operators with many folders |
| C4 | Counts/domains/ETA only when selected path **is** the live job | `pathMatch` gates (`app.js` 299–391). Away-from-live note exists (`#liveJobNote`) | Low (intentional); operator glancing at another job loses live counts |
| C5 | Six always-on settings + always-on CF panel vs 640px min height | PRODUCT/docs: settings not collapsed. DESIGN: readable at 720×640; PRODUCT min 880×640 | Medium crowding; no status bar despite PRODUCT brand sentence |
| C6 | Scan-option checkboxes not persisted | Only `apf-last-query` in `localStorage` | Low (PRODUCT does not require) |
| C7 | Turbo default **on** (concurrency 3) | `#concurrencyRow` `checked`; docs agree. PRODUCT line 42 reads as “2 unless Tăng tốc” | Spec ambiguity — ship matches docs, not a strict reading of PRODUCT |
| C8 | Linux hide-Chrome label | HTML: “Ẩn cửa sổ Chrome khi quét”. `docs/desktop-windows.md` §Ops Linux claims GUI label includes **(Xvfb)** | Docs/UI drift |
| C9 | English errors can land in `#message` | `out path escape blocked`, `csv path escape blocked` (`main.ts` 142, 299); `Job lỗi (…): ${cause}` may paste CLI English (`job-supervisor.ts` 240–242); orphan dialog “Hãy **Resume** … PID … Out:” (`main.ts` 107–110); CSV missing mentions `jsonl` (`main.ts` 296) | Medium (non-dev customer) |
| C10 | Stalled ETA | “kiểm tra Chrome/CF” (`eta.ts` 175) | Low |
| C11 | No in-app results table | PRODUCT: out of this rebuild; review in CSV | Not a gap |
| C12 | e2e does not lock `#probeParallel` unchecked | Hide-chrome is locked (`test/desktop-electron.e2e.test.ts` 149–152) | Test gap (phase-5 nit) |

### 3. i18n

**Policy:** `PRODUCT.md` — Vietnamese is the only supported language. English localization **undecided**. Brainstorm 260826 lists English i18n as non-goal Wave 1.

**What exists:** no `_locales`, no dictionary, no language switcher. Copy is hardcoded in `index.html` + `app.js` + `eta.ts` + a few `main.ts` / supervisor strings. `html lang="vi"`; dates `toLocaleDateString('vi-VN')`.

**Loanwords that are OK as product nouns:** Trustpilot, Chrome, Cloudflare, CSV, `results.csv`. PRODUCT itself uses **job** as the workspace noun; UI follows (**Job mới**, “thư mục job”).

**Tighten (still Vietnamese-only), do not add `en`:**

| Surface | Now | Why |
|---------|-----|-----|
| Probe hint | `28 path + junk`, `~30–40%` | Jargon + unshipped-as-SLA number |
| Prefix **ETA:** | `ETA: đang đo tốc độ…` etc. | Latin acronym; could be “Còn khoảng…” only (live labels already Vietnamese once estimated) |
| Orphan dialog | `Resume`, `PID`, `Out` | Operator English in a blocking dialog |
| Path-escape throws | English | Can appear in the dashboard message |
| CLI cause passthrough | English `[cli]` lines | Operator-useful; customer-hostile |

Do **not** start an English locale file unless PRODUCT changes. Extension i18n research (`plans/reports/ak-engineer-researcher-260810-1348-wxt-expanded-ui-i18n.md`) is popup-only and irrelevant to this window.

### 4. `docs/desktop-windows.md` needs

Customer doc is otherwise aligned with the workspace (list/preview, Start uses selected job, collect vs scan fractions, ETA hide rules, ethics). Required edits:

1. **§Cách dùng step 4** — add **Quét đường dẫn song song** to the default-**off** list with Dừng sớm / Kiểm tra mạng / Chờ tải linh hoạt. State: only for measured speed; does not change ethics (`blocked≠none`); batch ≤3; not a way to “giảm Chưa rõ”.
2. Drop or qualify any customer-facing “~30–40%” unless the doc labels it directional / not guaranteed.
3. **§Ops Linux** — either change the HTML title to include `(Xvfb)` or stop claiming the GUI label already does.
4. Step 7 still says **SIGINT** — operator word in a customer numbered list; prefer “dừng an toàn”.
5. Do not document English UI. Do not document in-app results.

**Other docs drift (not `desktop-windows.md` but customer-adjacent):**

- `desktop/README.md` Track A bullets omit `--probe-parallel`.
- Root `README.md` documents `--profile-timing` / lazy-settle / network-evidence; **`--probe-parallel` is CLI `--help` only**.
- `docs/01-product-overview.md` still describes a **Chrome Extension popup** as the solution (in-app table, confirmed/weak/none/blocked). PRODUCT + desktop-windows are the live customer story. 01 is evergreen-stale.
- Phase 5 markdown still says label TBD / status pending.

### 5. Accessibility (PRODUCT floor)

Present: keyboard rows, `:focus-visible` rings, `aria-live="polite"` on `#dashboard`, progressbar valuemin/max/now/text, visually-hidden filter label, `prefers-reduced-motion` kills progress transition + badge pulse.

Gaps: CF panel is not `role="alert"` and is not shown only when challenged; `#message` is not `aria-live`; no `aria-invalid` pairing beyond `is-error` class; filter-miss has no status text.

### 6. Spec contradictions (do not “fix” without a PRODUCT pass)

- PRODUCT brand paragraph asks for Explorer **status bar**; `DESIGN.md` does not; current window has none.
- PRODUCT min 880×640 vs DESIGN “readable at 720×640”.
- PRODUCT concurrency default wording vs shipped turbo-on (docs + HTML).

## Recommendations

1. **Docs (this eval’s cheapest close):** `docs/desktop-windows.md` §4 + `desktop/README.md` probe-parallel bullet + root README CLI flag. Same facts as the checkbox hint, without junk/path/% SLA.
2. **Copy:** rewrite probe hint in ordinary Vietnamese (e.g. mở vài đường dẫn chương trình cùng lúc, mặc định tắt, nhanh hơn trên máy mạnh; không dùng để giảm Chưa rõ).
3. **CF panel:** hide until challenge/error (or collapse to one line when idle). Always-on gold box fights “finished application workspace”.
4. **Filter empty:** if `visible.length === 0` && filter non-empty, show “Không khớp bộ lọc”.
5. **Customer errors:** Vietnamese for path-escape and orphan dialog (`Tiếp tục`, hide PID unless useful). Keep CLI log in a secondary/detail line if operators need it.
6. **e2e:** assert `#probeParallel` exists and `checked === false` (mirror hide-chrome).
7. **Do not:** English i18n, in-app results table, persist experimental flags, default-ON probe-parallel.

## Unresolved Questions

- Should turbo stay default **on** (docs/HTML) or default concurrency 2 (strict PRODUCT line 42)?
- Hide CF panel until needed, or keep it as a permanent ethics reminder?
- Is the 30-run cap acceptable, or must **Chọn thư mục…** be the documented escape for older jobs?
- Who owns refreshing `docs/01-product-overview.md` (extension vs desktop) — this scout or a docs track?
- Probe hint %: omit, or cite “đo thử nội bộ, không cam kết”?

Status: DONE
Summary: Desktop is a VN job workspace; phase-5 probe-parallel checkbox is default OFF. Gaps are docs/copy/CF-always-on/English error leaks, not missing job chrome.
Concerns/Blockers: none for scouting; docs/desktop-windows.md is the open phase-5 customer hole.
