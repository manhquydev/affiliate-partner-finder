---
title: "Bootstrap: Affiliate/Partner Finder v1 (MV3, WXT+TS)"
date: 2026-08-10
summary: Built MV3 extension end-to-end from docs; code review caught a critical anti-hallucination bug (href substring match) — fixed
---

# Bootstrap: Affiliate/Partner Finder v1 (MV3, WXT+TS)

## What happened
Bootstrapped the Affiliate/Partner Finder Chrome MV3 extension end-to-end from the
existing `./docs` design set (docs 01–11), via `ak:bootstrap --full` → `ak:plan --hard`
(5-phase validated plan) → `ak:cook`.

Stack chosen with the user: **WXT + TypeScript**, vanilla-TS popup, IndexedDB (`idb`), Vitest.

Phases delivered:
1. WXT+TS scaffold; manifest permissions `[tabs,scripting,storage,alarms]` + `[trustpilot, <all_urls>]`; typed schema (`lib/types.ts`) + isolated keyword/platform/path config (`lib/config.ts`) verbatim from docs/05.
2. Deterministic core: `detector` (in-page link-scan + bot-block heuristic), `path-probe` (junk-baseline soft-404 guard), `classify` (decision table docs/05 §6). 49 Vitest tests incl. full golden set.
3. Background orchestrator: throttled 1-tab scan queue, `resolve`, `collect` via Trustpilot `__NEXT_DATA__`, IndexedDB persistence, `chrome.alarms` SW-kill recovery.
4. Vanilla-TS popup: run form, realtime table w/ verdict badges, CSV/JSON export, open-evidence, rehydrate on open.
5. `test/verify-golden.mjs` golden-set verifier + README/load-unpacked docs.

## Decision
Ran `code-reviewer` as a mandatory gate. It caught a **critical anti-hallucination bug (C1)**:
platform detection did `href.includes("awin")`, so `drawing.com` (d-r-**awin**-g) fabricated
`affiliate/high` with zero real evidence — and under the default `design` query it would fire
constantly. Fixed by matching platform tokens against the parsed **hostname** with label/host
boundaries, plus regression tests. Also fixed H1 (probe failure silently discarded confirmed
link evidence), H2 (waitForComplete listener attached after tabs.create → false timeouts),
H3 (affiliate row could emit empty evidenceUrl → fall back to finalUrl), M2 (background START
guard), and low-severity L2/L3/L4. Two low-probability non-corrupting mediums (orphan tab on
SW-kill; progress read-modify-write race) accepted for v1 and documented.

Result: `tsc --noEmit` clean, 49/49 tests, `wxt build` OK. Committed `c306fdd` on `main`
(51 files, build artifacts excluded, not pushed).

## Next steps
- Live-browser acceptance is the remaining manual gate: `npm run build` → load unpacked
  `.output/chrome-mv3/` → run query "design" → Export JSON → `node test/verify-golden.mjs <json> --check-urls`.
- If a golden site drifted since docs were captured (2026-08-10), update the golden set + note the date rather than forcing a verdict (docs/07 §6).
- v1.1 candidates (docs/10): scan native-language homepage for mohd.it-style misses; smart retry for blocked sites; expand platform/path lists.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
