---
type: code-reviewer
date: 2026-09-01
lens: Failure Mode Analyst
---

# Red team: Failure modes

## Finding 1: Partial collect + stop currently falls into scan
- **Severity:** Critical
- **Location:** Phase 2, early return
- **Flaw:** After collect, only empty+stop returns 130. Non-empty + SIGINT continues to `launchScanSession`. Lite plan says skip scan but does not pin the branch to this fall-through.
- **Failure scenario:** User hits Dừng during Lấy danh sách after 40 companies → Chrome still opens merchant sites.
- **Evidence:** `cli/index.ts:318-345` — `stopRequested && companies.length === 0` return 130; else if length 0 return 1; else `scan pending=` + `launchScanSession`.
- **Suggested fix:** testable `afterCollectAction`; if collectOnly, write CSV and return (130 if stop, 0 if complete) before pending/scan.

## Finding 2: onExit synthesizes header-only results.csv when jsonl empty
- **Severity:** High
- **Location:** Phase 3, supervisor
- **Flaw:** Plan already notes companies.csv skip; actual condition writes whenever `!failed` even with empty jsonl. SIGINT during collect (no jsonl) already hits this on Full.
- **Evidence:** `desktop/job-supervisor.ts:299-317` `if (this.outDir && !csvOk && (!failed || hasResults)) writeSimpleCsvFromJsonl`; `desktop/ket-qua-counts.ts:62-66` writes `toSimpleCSV(results)` even if empty.
- **Suggested fix:** skip synth when jsonl missing or size 0 (stronger than companies.csv exists).

## Finding 3: Idle collect copy says stopped after successful lite
- **Severity:** High
- **Location:** Phase 3, renderer
- **Flaw:** `collecting = phase==='collect'` ignores running. After lite, progress stays collect. Idle hint: "Đã dừng lúc lấy danh sách. Bấm Tiếp tục…"
- **Evidence:** `desktop/renderer/app.js:326,341-347`
- **Suggested fix:** idle + collect + companies.csv / collectOnly: "Đã lấy danh sách. Mở CSV hoặc Tiếp tục để quét website."

## Finding 4: New button not in existing lock helpers
- **Severity:** High
- **Location:** Phase 3, lock
- **Flaw:** Plan says lock with Start but lockLaunchControls only disables btnStart/btnResume.
- **Evidence:** `desktop/renderer/app.js:405-407,534-542`
- **Suggested fix:** include `#btnCollectList` in disabled/lock/unlock/titles.

Status: DONE
