---
title: "Collect-list lite (Lấy danh sách)"
description: "Add a lite first pass that stops after Trustpilot collect and writes companies.csv (stt,ten_website,link). Full scan stays unchanged."
status: pending
priority: P1
effort: 6h
branch: main
tags: [feature, frontend, cli, desktop]
blockedBy: []
blocks: []
created: 2026-09-01
---

# Collect-list lite (Lấy danh sách)

## Overview

First process today is Collect then Scan (`cli/index.ts` after `companies.json`). Lite is a **sibling mode**, not a replacement: button **Lấy danh sách** / CLI `--collect-only` stops after Trustpilot collect and writes `companies.csv` with header `stt,ten_website,link`. **Bắt đầu** / `--resume` Full scan stay as they are. Same job folder: lite snapshot enables later **Tiếp tục** Full scan.

## Scope Challenge

- Existing: Collect already writes `companies.json`; `resolveViaReviewPage` default false → `https://{domain}`; `csvCell` formula-injection guard; desktop Start always scans.
- Requested: desktop label **Lấy danh sách**; CSV `stt,ten_website,link`; keep Full.
- Rejected: 2-column `=HYPERLINK()` (csvCell prefixes `=`). Spreadsheet already opens the `link` column.
- Complexity: ~10 existing files, 0 new services. HOLD SCOPE.
- Mode: hard-equivalent gates (red-team + validate loops). Not `--deep`.

## Cross-Plan Dependencies

None. Unfinished `260810-1229` (extension) and `260826-0909` (Win smoke) do not share this CLI/desktop contract.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Lite stops after Collect; no merchant scan | P1 |
| 2 | CSV `stt,ten_website,link` via `csvCell` | P1 |
| 3 | Desktop button **Lấy danh sách** beside **Bắt đầu** | P1 |
| 4 | Full Start/Resume/detector/`results.csv` unchanged | P1 |
| 5 | Lite job can **Tiếp tục** into Full scan | P1 |

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Export companies.csv](./phase-01-start.md) | Pending |
| 2 | [CLI --collect-only](./phase-02-cli-collect-only.md) | Pending |
| 3 | [Desktop Lấy danh sách](./phase-03-desktop-lay-danh-sach.md) | Pending |
| 4 | [Docs and regression](./phase-04-docs-and-regression.md) | Pending |

## Decisions (locked)

- Desktop control: extra button **Lấy danh sách**, not a Lite toggle, not renaming **Bắt đầu**.
- CSV file: `companies.csv` (never overwrite `results.csv` schema).
- Link: `https://{domain}` (export `domainToUrl` from `lib/resolve.ts`). No review-page resolve.
- `--resume --collect-only`: reject (exit 2). Resume = Full scan.
- Open CSV: `results.csv` if present, else `companies.csv`. Both paths: `resolveExistingPath` + `isPathInside(runsRoot)`.
- Supervisor `onExit`: skip `writeSimpleCsvFromJsonl` when jsonl missing **or size 0** (not only when `companies.csv` exists). Today `!failed` still synths header-only `results.csv` (`desktop/job-supervisor.ts:314-317`, `desktop/ket-qua-counts.ts:62-66`).
- Lite skip-scan is `afterCollectAction` **before** `cli/index.ts:333` pending/`launchScanSession`. Stop+partial Full still scans (unchanged). Stop+partial lite: CSV then exit 130.

## Dependencies

- Existing Collect / Cloudflare / `canStartFresh` / `companies.json` snapshot.
- Do not rewrite detector, classify, or Full `toSimpleCSV`.

## Success Criteria

- [ ] `--collect-only` writes `companies.csv` and never launches `launchScanSession`
- [ ] Header exactly `stt,ten_website,link`; stt 1-based collect order
- [ ] **Lấy danh sách** on desktop; **Bắt đầu** still Collect+Scan
- [ ] **Mở CSV** after lite opens `companies.csv`
- [ ] **Tiếp tục** on that folder runs Full scan
- [ ] Existing `toSimpleCSV` / Full argv tests still pass

## Unresolved Questions

None. User locked label + 3-column header. 2-col hyperlink rejected (formula injection).

## Red Team Review

### Session — 2026-09-01
**Findings:** 11 (7 accepted, 4 rejected)
**Severity breakdown:** 1 Critical, 5 High, 5 Medium (incl. rejected)
**Note:** `code-reviewer` subagents failed (Opus rate limit). Controller ran Security / Failure / Assumption lenses with file:line evidence. Reports: `reports/redteam-security.md`, `redteam-failure.md`, `redteam-assumptions.md`.

| # | Finding | Severity | Disposition | Applied To |
|---|---------|----------|-------------|------------|
| 1 | Stop+partial collect falls into scan | Critical | Accept | Phase 2 |
| 2 | Help test does not prove skip-scan | High | Accept | Phase 2 |
| 3 | onExit synth on empty jsonl | High | Accept | Phase 3, Decisions |
| 4 | Idle collect copy after lite success | High | Accept | Phase 3 |
| 5 | btnCollectList missing from lock helpers | High | Accept | Phase 3 |
| 6 | openCsv isPathInside for companies.csv | High | Accept | Phase 3 |
| 7 | csvCell on `=` name / `-` domain | Medium | Accept | Phase 1 |
| 8 | Non-atomic CSV | Medium | Accept | Phase 2 |
| 9 | domainToUrl export risk | Medium | Reject | no other callers |
| 10 | Company.name already fallback | Medium | Reject | keep CSV fallback; Collect already `u.name \|\| domain` |
| 11 | IPC whitelist hole | Critical | Reject | already in phase 3 |

### Whole-Plan Consistency Sweep
- Files reread: plan.md, phase-01-start.md, phase-02-cli-collect-only.md, phase-03-desktop-lay-danh-sach.md, phase-04-docs-and-regression.md
- Decision deltas checked: 8
- Reconciled stale references: skip-scan site pinned to pre-`launchScanSession`; onExit skip = empty jsonl; idle copy; lock helpers
- Unresolved contradictions: 0

## Validation Log

### Session 1 — 2026-09-01
**Trigger:** User locked UI label + CSV header; requested validate+red-team until clean then cook. No second interview (decisions already in-thread).
**Questions asked:** 0 this session (pre-answered)

#### Questions & Answers

1. **[Architecture]** Desktop control for lite?
   - Options: toggle Lite | extra button **Lấy danh sách** | rename Bắt đầu
   - **Answer:** extra button **Lấy danh sách**
   - **Rationale:** Full Bắt đầu must remain

2. **[Contract]** CSV header?
   - Options: `stt,ten_website,link` | 2-col name+HYPERLINK
   - **Answer:** `stt,ten_website,link`
   - **Rationale:** `csvCell` would neutralize `=HYPERLINK(` (`lib/export.ts:82-85`)

#### Confirmed Decisions
- Button label **Lấy danh sách**
- CSV 3 columns; no spreadsheet formulas
- Full scan unchanged; lite sibling

#### Action Items
- None beyond accepted red-team (already applied)

#### Impact on Phases
- None new

### Verification Results
- **Tier:** Standard (4 phases)
- **Claims checked:** 15
- **Verified:** 15 | **Failed:** 0 | **Unverified:** 0
- Fact Checker + Contract Verifier (controller; Opus reviewers unavailable)

Key VERIFIED:
- Collect→scan fall-through `cli/index.ts:318-345`
- `domainToUrl` unexported `lib/resolve.ts:16`
- `csvCell` `lib/export.ts:82-85`
- `desktop:start` whitelist `desktop/main.ts:228-266`
- `onExit` synth `desktop/job-supervisor.ts:314-317`
- `canStartFresh` `desktop/progress.ts:67-70`
- `toSimpleCSV` header `lib/export.ts:158`
- preload forwards opts `desktop/preload.cjs:6`
- idle collect copy `desktop/renderer/app.js:326,341-347`
- lock helpers `desktop/renderer/app.js:405-407,534-542`
- open-csv results only `desktop/main.ts:292-296`
- `buildScanArgv` callers: `desktop/job-supervisor.ts:103`, `test/desktop-adapter.test.ts`, `test/windows-parity.test.ts`
- `toSimpleCSV` callers: `cli/index.ts:454`, `desktop/ket-qua-counts.ts:66`, `scripts/merge-shards.ts:134`, tests

### Whole-Plan Consistency Sweep
- Files reread: plan.md + phase-01..04
- Decision deltas checked: user label/header + 7 accepted RT findings
- Reconciled stale references: 0 remaining
- Unresolved contradictions: 0

### Red-team round 2 (post-apply)
Specialized re-read: skip-scan branch, supervisor jsonl, renderer idle copy, IPC whitelist, lock helpers.
**New accepted findings:** 0. Plan clean for cook.
