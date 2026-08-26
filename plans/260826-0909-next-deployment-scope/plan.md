---
title: "Next deployment scope — desktop complete then quality evidence"
description: "Ship desktop 1.0.10 UI/IPC polish; customer smoke; bounded Track A A/B; defer Track B to separate slug."
status: pending
priority: P0
effort: "2-4d"
tags: [desktop, release, track-a, customer, scope]
created: 2026-08-26
related:
  - plans/reports/brainstorm-260826-0909-project-status-next-scope.md
  - PRODUCT.md
  - DESIGN.md
---

# Next deployment scope

## Overview

Sau brainstorm 2026-08-26: dự án **functionally mature** trên desktop/CLI; gap khách hàng còn lại nằm ở **delta UI/IPC chưa ship** và **release discipline**. Chất lượng detector (Track A) cần **measurement**, không thêm feature. Track B (access-unknown) là wave riêng.

**North star (PRODUCT.md):** Cửa sổ desktop là workspace job — khách không-dev chạy scan, theo dõi, mở CSV tin cậy, xử lý Cloudflare một lần.

## Brainstorm contract

| Field | Content |
|-------|---------|
| **Outcome** | v1.0.10 desktop released; Win smoke pass; plan 260812 closed; Track A A/B report or explicit defer |
| **Constraints** | No engine rewrite; quality flags OFF on live 10k; ethics; Vietnamese only |
| **Non-goals** | LLM; extension parity; in-app results; code signing (unless user promotes); mixing A/B into release PR |
| **Acceptance** | See Success Criteria below |

## Goals

| # | Goal | Priority | Wave |
|---|------|----------|------|
| 1 | Land + ship desktop IPC/UI delta (selected job CSV, browse while running) | P0 | 1 |
| 2 | Customer release 1.0.10 + docs | P0 | 1 |
| 3 | Windows VM smoke checklist | P0 | 1 |
| 4 | Close desktop GUI plan slug | P1 | 2 |
| 5 | Extension live golden (manual) | P1 | 2 |
| 6 | Track A bounded A/B on copy cohort | P1 | 3 |
| 7 | Track B access plan (if KPI flat) | P2 | 4 |

## Phases

| # | Phase | Status | Depends |
|---|-------|--------|---------|
| 1 | [Desktop 1.0.10 ship](./phase-01-desktop-110-ship.md) | Pending | — |
| 2 | [Plan hygiene + extension gate](./phase-02-plan-hygiene-extension-gate.md) | Pending | 1 |
| 3 | [Track A A/B evidence](./phase-03-track-a-ab-evidence.md) | Pending | 1, 2 |
| 4 | [Track B access (optional slug)](./phase-04-track-b-access-optional.md) | Pending | 2, 3 |

## Success Criteria

- [ ] Desktop delta **merged on main** (not merely uncommitted); `package.json` = `1.0.10`
- [ ] `npm test` 152 pass; e2e 10+ pass **including IPC openCsv/openOutDir on selected `#out`**
- [ ] `desktop:open-csv` / `desktop:open-out` use selected `#out`; idle handler must **not** snap `#out` back to supervisor when user browsed away
- [ ] Start/Resume re-read `$('out')` immediately before IPC (no stale snapshot after row click during `syncFromOutDir`)
- [ ] User can select another job row while scan runs; `liveJobNote` visible; Stop stops live job
- [ ] **Win VM smoke PASS before tag** (Start → Stop → Resume → Mở CSV on **selected** job) — documented checklist
- [ ] Tag `v1.0.10` pushed → CI `release-desktop.yml` produces Win NSIS (>50MB); no local wine pack required on Linux dev host
- [ ] Plan `260812-0939` marked completed
- [ ] Track A: metrics report with A2 numbers OR written "deferred" with reason
- [ ] No marketing claim that Track A reduced unknown%

## Risks

1. Shipping 1.0.9 semantics (CSV supervisor-only) confuses customers — **mitigated by Wave 1**.
2. Enabling quality flags on live 10k mid-flight — **forbidden**.
3. Treating uncommitted diff as "already released" — **version bump required**.

## Decision log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-08-26 | Customer-first: desktop 1.0.10 before Track A A/B | PRODUCT design target = desktop window |
| 2026-08-26 | Track B separate slug | Different KPI (access vs recall) |
| 2026-08-26 | Defer extension/LLM | Out of rebuild scope |
| 2026-08-26 | Smoke before tag; CI-only Win pack on Linux | red-team RT-1, RT-3; wine ENOENT on dev host |
| 2026-08-26 | Phase 3 depends on Phase 2 | red-team RT-5 dependency enforcement |
| 2026-08-26 | Track A sequential + allowlist script | red-team RT-4 production out-dir firewall |

## Red Team Review

**Session:** 2026-08-26 red-team round 1 (3 hostile reviewers)

| ID | Sev | Finding | Disposition |
|----|-----|---------|-------------|
| RT-1 | Critical | Tag/release before mandatory Win smoke | **Accept** — smoke gate before tag in success criteria |
| RT-2 | High | Start uses frozen `outSnapshot` during async sync | **Accept** — phase-01 step: re-read `#out` before startJob |
| RT-3 | High | Idle `refreshRunPicker(s.outDir)` snaps browsed selection | **Accept** — phase-01: skip setOutPath on idle if away from live job |
| RT-4 | Critical | Track A `--resume` no denylist for design-full-10k | **Accept** — phase-03: `scripts/track-a-ab.sh` allowlist |
| RT-5 | High | Phase 3 parallel with Phase 2 allowed | **Accept** — deps updated to [1,2] and [2,3] |
| RT-6 | Critical | Symlink escape on non-existent out paths | **Accept (defer code)** — document known risk; no new symlink hardening in Wave 1 unless trivial |
| RT-7 | High | Zero IPC tests for open-csv/open-out | **Accept** — add e2e IPC coverage in phase-01 |
| RT-8 | Critical | Uncommitted diff treated as shippable | **Accept** — merge gate explicit |
| RT-9 | Critical | Win pack on Linux failed (wine ENOENT) | **Accept** — CI tag path only |
| RT-10 | High | Track A sample <50 domains, no companies.json seed | **Accept** — phase-03 preflight |

### Whole-Plan Consistency Sweep (round 1)

- Dependencies in plan.md phases table match phase frontmatter after edits.
- Success criteria aligned: tag requires smoke first; no "pretest EXE OR tag" loophole in phase-01.
- Open: RT-6 symlink hardening tracked as post-1.0.10 security follow-up if not trivial.

## Validation Log

### Verification Results (2026-08-26, Standard tier)

- Claims checked: 24
- Verified: 20 | Failed: 2 | Unverified: 2
- Tier: Standard (Fact Checker + Contract Verifier)

**Verified:**
- `requestedOutDir` at `desktop/main.ts:273` — exists in working tree
- `liveJobNote` at `desktop/renderer/index.html:108`
- `openCsv(out)` preload at `desktop/preload.cjs:9`
- Version `1.0.9` at `package.json:3` (bump pending)
- 152 unit tests pass (2026-08-26 run)
- 9 e2e pass; plan requires +1 IPC test
- CI release on tag: `.github/workflows/release-desktop.yml`
- Plan 260812 status `in-progress` at `plans/260812-0939-windows-desktop-gui-electron-shell/plan.md:4`

**Failed:**
- `npm run desktop:pack:win` on Linux dev host — wine ENOENT (plan updated: CI-only)
- `track-a-none-ok-sample-domains.txt` count 40 < 50 required — phase-03 preflight added

**Unverified:**
- Win VM smoke (manual gate)
- Merge CSV availability for Track A (ops machine)

### Validation Decisions (autonomous — user requested validate loop)

| Q | Decision | Rationale |
|---|----------|-----------|
| Win pack path? | **CI on tag `v1.0.10` only** | Local wine missing; partial 190KB artefact invalid |
| Smoke vs tag order? | **Smoke before tag** | RT-1; customer gate |
| Phase 3 before Phase 2? | **No** | RT-5; enforce deps |
| Symlink hardening in Wave 1? | **Defer** unless <30min fix | Pre-existing; scope Wave 1 = UX IPC |
| Track A defer if no merge? | **Yes — written defer OK** | Phase-03 success allows defer with reason |
| Boot stamp synthetic row? | **Document in README; no code block** | CR-260826 open item waived for 1.0.10 |

### Whole-Plan Consistency Sweep (validation)

- Phase-01 success criteria match plan.md top-level gates.
- Phase-03 `dependencies: [1, 2]` synced.
- Phase-04 `dependencies: [2, 3]` synced.
- No unresolved contradictions — **ready for `/ak:cook` Phase 1**.
