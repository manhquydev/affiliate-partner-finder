# WXT 0.19 Expanded UI + i18n + Result-State UX — Research Report

Scope: report-only, no files changed. Project: `affiliate-partner-finder` (WXT 0.19, TS, MV3, popup-only today).

## Q1 — Expanded UI: full-page tab vs options_ui(open_in_tab) vs sidePanel

**Trade-off matrix**

| | (a) plain tab entrypoint | (b) options_ui + open_in_tab | (c) chrome.sidePanel |
|---|---|---|---|
| Max width | Unbounded (full window) | Unbounded (full window) | User-resizable but narrow-biased (~320–500px typical); cramped for a 200-row multi-column table |
| Singleton (no dupe tabs) | Manual — you must track/focus an existing tab yourself | **Free** — `chrome.runtime.openOptionsPage()` focuses the existing options tab if already open | N/A (docked per-window, not tab-based) |
| WXT setup cost | `entrypoints/<name>/index.html`, unlisted — you write the `chrome.tabs.create(getURL(...))` + dedup logic | `entrypoints/options/index.html` — WXT auto-registers `options_ui` in the manifest, zero extra code | `entrypoints/sidepanel/index.html` — WXT auto-adds `side_panel` + `sidePanel` permission |
| Semantic fit | Clean ("dashboard" is just a page) | Slight mismatch (page is really a dashboard, not settings) — mitigated with in-page nav/tabs | Poor fit here — panel content is decoupled from the active tab the user is browsing |
| Fit for config editor | Fine | Very natural (that's literally what options pages are for) | Cramped for a JSON/form editor |
| Fit for "watch a running scan" | Fine, but user must actively keep the tab open | Fine | Would be *ideal* only if the scan ran in the tab the user is looking at — but this extension scans via **background, inactive tabs it creates itself** (`chrome.tabs.create({active:false})`), so there's no "current page" for the panel to be a companion to. The side panel's main advantage (staying open while you browse) doesn't apply. |

**Recommendation: (b) options_ui with `open_in_tab: true`.**
Rank: (b) > (a) > (c).

Why (b) over (a): identical full-width real estate, but you get free singleton-tab focusing from the browser (`chrome.runtime.openOptionsPage()`), which a plain tab entrypoint requires you to hand-roll (extra code = violates YAGNI/DRY for no UX gain). It's also a well-established real-world pattern (OneTab, Toby, etc. use the options-page-as-full-app pattern for exactly this reason). Mitigate the naming mismatch with in-page tabs ("Dashboard" / "Settings") inside the one options page rather than pretending it's two products.

Why not (c): the side panel's value proposition (stays docked while browsing) doesn't map to this extension's architecture, and its narrower default width is a poor fit for a wide, filterable, sortable, 200-row table with per-row evidence detail. [Chrome sidePanel best-practice guidance](https://developer.chrome.com/blog/extension-side-panel-launch) explicitly frames it as a "companion to browsing," not a data workbench.

**Exact WXT config for the recommendation:**

`entrypoints/options/index.html` (WXT auto-detects `entrypoints/options.html` or `entrypoints/options/index.html` as the `options_ui` main entrypoint — no `wxt.config.ts` manifest edit needed):

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="manifest.open_in_tab" content="true" />
    <title>Affiliate/Partner Finder</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./main.ts"></script>
  </body>
</html>
```

Open it from the popup: `chrome.runtime.openOptionsPage()`. No `wxt.config.ts` changes required — WXT reads the `<meta name="manifest.*">` tags per-entrypoint. If you'd rather centralize config, WXT also lets you set `manifest` as a function in `wxt.config.ts` and merge fields in the `build:manifestGenerated` hook, but for `open_in_tab` the meta-tag route is the documented, simplest path.

Sources: [WXT Entrypoints guide](https://wxt.dev/guide/essentials/entrypoints.html), [WXT Manifest config guide](https://wxt.dev/guide/essentials/config/manifest), [Chrome side panel launch guidance](https://developer.chrome.com/blog/extension-side-panel-launch), [chrome.sidePanel API reference](https://developer.chrome.com/docs/extensions/reference/api/sidePanel).

---

## Q2 — i18n: native `chrome.i18n` + `_locales` vs custom TS dictionary

**Recommendation: native `_locales/<lang>/messages.json`** (optionally authored via the official `@wxt-dev/i18n` module), not a hand-rolled TS dictionary.

Reasoning:
- You need `_locales` + `default_locale` *regardless* of app-level i18n choice if you ever want the manifest's own `name`/`description` localized for the Web Store (`__MSG_name__` syntax) — [WXT i18n guide](https://wxt.dev/guide/essentials/i18n). Building a second, parallel TS dictionary for UI strings duplicates the message store (violates DRY) for no benefit.
- `@wxt-dev/i18n` is a thin, official wrapper: `modules: ['@wxt-dev/i18n/module']` + `manifest: { default_locale: 'vi' }`, author messages in `<srcDir>/locales/vi.yml` (or `.json`), it compiles to the exact native `_locales/vi/messages.json` format at build time — same output, better authoring DX (typed keys, YAML/JSON5, ICU-style interpolation) — [`@wxt-dev/i18n`](https://wxt.dev/i18n), [npm package](https://www.npmjs.com/package/@wxt-dev/i18n).
- Both native `chrome.i18n.getMessage()` and `@wxt-dev/i18n`'s `t()` are bound to the **browser's UI language** — confirmed directly from the WXT i18n docs: *"Like the `browser.i18n` API, to change the language, users must change the browser's language."* There is **no built-in in-app language switcher** in either approach. Since this is VN-first with English only a "maybe later," that's an acceptable constraint now (YAGNI — don't build a runtime switcher you don't need yet). If a true in-app switcher becomes a hard requirement later, neither native nor `@wxt-dev/i18n` gives you one for free — you'd need a custom loader that bypasses `getMessage()` and reads `_locales/<lang>/messages.json` directly based on a stored user pref. Flag this now as a known future risk, don't build it today.

**KISS verdict:** ship `default_locale: 'vi'`, one `_locales/vi/messages.json` (or via the WXT module), add `en` later by dropping in a second locale file — zero code changes for the simple case.

**Injected functions (`lib/detector.ts` `runDetector`, `lib/path-probe.ts` `pathProbe`) — do NOT need i18n.** Confirmed by reading both files: they run inside the target page via `chrome.scripting.executeScript({ func })`, are fully self-contained (per their own top-of-file comments, no module-scope imports), and return only structured data (`loadStatus`, `linkHits`, `pathHits`, etc.) — they render zero UI and contain zero user-facing strings (the block-detection phrases like `'just a moment'`, `'cloudflare'` are internal matching literals, not displayed to the user). i18n only matters where you render strings to the user — popup, options/dashboard, badges — never in these injected probes.

Sources: [WXT i18n guide](https://wxt.dev/guide/essentials/i18n), [@wxt-dev/i18n](https://wxt.dev/i18n), [GitHub i18n module source](https://github.com/wxt-dev/wxt/tree/main/packages/i18n).

---

## Q3 — Result-state UX (verdict × confidence × loadStatus + evidence)

Short, practical rules (general UX best practice for trust/confidence surfaces, e.g. VirusTotal, Dependabot alerts, GitHub code-scanning):

- **Never blend verdict and confidence into one color/badge.** Two independent badges: verdict (`affiliate` / `partner_trade` / `none` / `unknown`) and confidence (`high`/`medium`/`low`/`blocked`), because `unknown` + `blocked` is a *data quality* problem, not a negative business finding — conflating them makes "we couldn't check" look identical to "we checked and there's nothing."
- **`loadStatus !== 'ok'` must visually short-circuit before verdict is shown** — show a distinct "blocked/timeout/error" state (e.g. grey/hatched row, no verdict badge at all) rather than rendering `unknown`/`blocked` as if it were a real finding. This matches your own `classify()` invariant (`loadStatus!=='ok'` → `unknown`/`blocked`) — make the UI enforce the same rule visually, don't let a styled badge imply certainty that doesn't exist.
- **Every non-`none` verdict must link to its evidence** — clicking the badge/row expands the exact `linkHits`/`pathHits`/`platformHits` that produced it (anchor text + href, or path + status code). A verdict with no visible evidence trail is not trustworthy — this is the #1 complaint pattern in security/scanner-tool UX research (users distrust black-box verdicts).
- **Legend, always visible, not just on hover** — a persistent small legend (verdict icon/color key + confidence key) since users will triage a table quickly; tooltips-only get missed.
- **Empty/blocked states need their own copy**, not "0 results": distinguish "no companies scanned yet," "scan blocked by target site (bot check)," and "scanned, genuinely no affiliate signal found" — three different empty-looking rows.
- **Evidence provenance**: show `detectorVersion` and `scannedAt` per row (both already in your `ScanResult` type) so stale results from an older detector logic don't get silently trusted alongside fresh ones after a detector update — surface a "re-scan" affordance when `detectorVersion` is stale.

This is general UX practice cross-referenced with your existing `lib/types.ts` (`Verdict`/`Confidence`/`LoadStatus`/`Evidence` already model this correctly) — no framework-specific research needed here; the risk is purely presentation-layer discipline.

---

## Unresolved / not covered
- Did not evaluate a specific component/table library (e.g. TanStack Table) for the 200-row sortable/filterable grid — out of scope per the 3 questions asked; worth a follow-up research pass before implementation.
- Did not verify `@wxt-dev/i18n`'s exact interpolation/pluralization syntax in depth (ICU vs simple `{name}`) — check the module's README at implementation time.
- Side panel width figures are from general Chrome documentation/community reporting, not a hard spec number — Chrome allows user-resizing, so treat "narrow-biased" as a UX tendency, not a hard limit.
