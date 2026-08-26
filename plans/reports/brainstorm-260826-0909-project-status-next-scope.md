---
type: brainstorm
date: 2026-08-26
scope: affiliate-partner-finder — completion audit + next deployment scope
sources: PRODUCT.md, DESIGN.md, README.md, git HEAD, tests, plans/reports/*
---

# Brainstorm — Tình trạng hoàn thiện & phạm vi triển khai tiếp theo

**Timestamp:** 2026-08-26 09:09 +07  
**Repo:** `affiliate-partner-finder` @ `main` `c84aea6` (desktop **1.0.9**)  
**Mục tiêu sản phẩm (PRODUCT.md):** Cửa sổ desktop **Trình dò Affiliate/Partner** — workspace job local, CSV HITL đáng tin (`true`/`false`/`unknown`), không bypass ethics.

---

## Brainstorm contract

| Field | Nội dung |
|-------|----------|
| **Outcome** | Ma trận hoàn thiện theo bằng chứng; phạm vi triển khai tiếp theo có thứ tự, gate, và acceptance rõ; hướng đi bám mục tiêu sản phẩm (customer desktop first). |
| **Constraints** | Không rewrite engine; ethics (≤3 concurrency, no CF bypass); một scan / shared Chrome profile; flags chất lượng default OFF trên job lớn; tiếng Việt là ngôn ngữ duy nhất. |
| **Non-goals** | LLM classify; extension parity ngay; in-app results table; English i18n; code signing (chưa quyết); port Crawl4AI/stealth; marketing claims chưa đo. |
| **Acceptance** | Báo cáo này + plan slug `260826-0909-next-deployment-scope` với phases, gates, success criteria có thể verify. |

---

## 1. Executive summary

Dự án đã vượt xa “extension v1 prototype”: có **3 bề mặt sản phẩm** (Extension MV3, CLI batch Playwright, Desktop Electron) dùng chung `lib/` detector/classify. **Đường giao khách hàng** (desktop Windows/Linux) là near-complete về chức năng cốt lõi; **gap lớn nhất** là (a) delta UI/IPC chưa commit/ship sau 1.0.9, (b) chất lượng Track A **code shipped, lift chưa đo**, (c) ~31% `unknown` trên cohort 10k là **access failure** (Track B), không phải detector recall.

**Khuyến nghị hướng triển khai:** **Wave 1 — Ship desktop polish (1.0.10)** → **Wave 2 — Customer smoke + release** → **Wave 3 — Quality evidence (A/B bounded)** → **Wave 4 — Track B access** → defer extension/LLM.

---

## 2. Ma trận hoàn thiện (evidence-gated)

Phân vùng theo red-team partition (`redteam-260813-0900`); cập nhật snapshot 2026-08-26.

### A. Shipped & verified (production-ready code)

| # | Hạng mục | Badge | Bằng chứng |
|---|----------|-------|------------|
| A1 | Detector 3 lớp + classify deterministic | **VERIFIED** | `lib/detector.ts`, `classify.ts`; 30+ classify tests |
| A2 | Ethics floor: blocked ≠ none | **VERIFIED** | classify tests; PRODUCT principles |
| A3 | CLI batch: collect/scan/resume/CSV | **VERIFIED** | `cli/`; plan `260810-1610` complete |
| A4 | `--scan-profile`, closeQuietly, virtual-display | **VERIFIED** | plans 260811-1425; desktop 1.0.5–1.0.7 |
| A5 | Collect 10k: WAF retry, max-pages, progress | **VERIFIED** | commit `cdbc112`; desktop 1.0.8 |
| A6 | Desktop Electron shell + supervisor | **VERIFIED** | plan 260812-0939 phases; adapter 34 tests |
| A7 | Desktop job workspace (bảng + preview) | **VERIFIED** | commit `6a40887`; e2e shell |
| A8 | Windows Start (no Linux virtual-display leak) | **VERIFIED** | plan 260825 complete; 1.0.6 |
| A9 | Track A flags: network-evidence, lazy-settle (default OFF) | **VERIFIED** | PR #1 lineage; 152 unit pass |
| A10 | Rolling ETA, stall hide >8m | **VERIFIED** | PR #2; desktop renderer |
| A11 | Extension MV3 pipeline (popup, background, export) | **VERIFIED** | plan v1 phases 1–4 complete; `wxt build` |
| A12 | Golden verify tooling | **VERIFIED** | `test/verify-golden.mjs` |

**A count: 12**

### B. Shipped but unmeasured / partial UX

| # | Hạng mục | Badge | Bằng chứng | Gap |
|---|----------|-------|------------|-----|
| B1 | Network-evidence recall lift trên site thật | **UNMEASURED** | Live CSV `method=network=0`; A/B sample chưa bind số | Không bật flag production cho đến khi A2 pass |
| B2 | Lazy-settle recall/latency | **UNMEASURED** | Flag chưa trên cohort đo | A7>A6 gate |
| B3 | Extension v1 live golden run | **MANUAL PENDING** | plan v1 phase-5 checkbox mở | Cần 1 lần export JSON + verify-golden |
| B4 | Desktop plan slug 260812 | **STALE in-progress** | Functional ship 1.0.9 nhưng plan chưa đóng | Cập nhật plan + close sau smoke |
| B5 | Track A plan 260813-0816 | **pending** frontmatter | Code merged; phase-04 measurement partial | Đóng hoặc spin slug A/B riêng |

**B count: 5**

### C. In progress (working tree / chưa release)

| # | Hạng mục | Badge | Bằng chứng |
|---|----------|-------|------------|
| C1 | Desktop UI delta (DESIGN canon + IPC selected job) | **READY TO SHIP** | Uncommitted diff 12 files; e2e 9/9 pass; CR-260826 patched criticals |
| C2 | CSV/Mở thư mục theo job đang chọn | **IN DIFF** | `desktop/main.ts` `requestedOutDir(outPath)`; docs/desktop-windows.md updated |
| C3 | Chọn job khác khi đang quét + liveJobNote | **IN DIFF** | PRODUCT operating context; e2e selection tests |
| C4 | Form preview reorder (cấu hình trước actions) | **IN DIFF** | DESIGN.md two-pane preview |
| C5 | design-full-10k merge job | **UNKNOWN LIVE** | Last audit ~50% @ 2026-08-13; cần re-check `out/` nếu còn ops |

**C count: 5**

### D. Locked / not started (explicit defer)

| # | Hạng mục | Authority |
|---|----------|-----------|
| D1 | Track B timeout/retry **code** | Runbook only; separate plan |
| D2 | Extension network/lazy-settle parity | Plan non-goal |
| D3 | LLM extract (ok+inconclusive only) | docs/10 v2; validate gate FAIL on unknown |
| D4 | English localization | PRODUCT undecided |
| D5 | Code signing | PRODUCT undecided; SmartScreen documented |
| D6 | In-app results browser | PRODUCT explicitly out of rebuild |

**D count: 6**

### E. Rejected non-goals (giữ nguyên)

Stealth/bypass; concurrency >3; unknown%↓ as Track A KPI; big-bang A+B; Firecrawl-as-core; full Xia ports — xem `redteam-260813-0900` §E.

---

## 3. Đối chiếu PRODUCT.md → thực tế

| Yêu cầu sản phẩm | Trạng thái | Ghi chú |
|-------------------|------------|---------|
| Trustpilot keyword + limit 1–10000 | ✅ | CLI + desktop |
| Job folder pick/new/resume | ✅ | |
| Scan options + defaults | ✅ | hideChrome on; turbo 3; quality flags off |
| Start/Resume/Stop + SIGINT CSV | ✅ | |
| Live dashboard (phase, %, ETA, counts, domains) | ✅ | Stall ETA hide |
| Cloudflare panel (no bypass) | ✅ | Không e2e live |
| Open CSV + job folder | ⚠️ → ✅ in diff | HEAD: supervisor-only; diff: selected `#out` |
| Vietnamese UI | ✅ | |
| Job workspace (not stacked form) | ✅ 1.0.9 + polish in diff | |
| Linear × Explorer visual canon | ⚠️ partial | DESIGN.md 2026-08-26; styles in diff |
| Select other job while scan runs | ⚠️ → ✅ in diff | PRODUCT §Operating Context |
| One scan at a time | ✅ | |
| No in-app results table | ✅ out of scope | |

**Kết luận PRODUCT alignment:** Delta uncommitted **đóng gap cuối** giữa spec operating context và IPC thực tế. Đây là ưu tiên Wave 1.

---

## 4. So sánh hướng triển khai tiếp theo

| # | Hướng | Pros | Cons | Phù hợp mục tiêu |
|---|-------|------|------|-----------------|
| **1** | **Ship desktop 1.0.10 (UI+IPC delta)** | Trực tiếp customer window; tests green; docs đã cập nhật | Cần pack + Win smoke | **Chọn — P0** |
| 2 | Track A A/B ngay trên copy cohort | Evidence cho network-evidence | Không chặn khách dùng desktop; ops risk nếu nhầm cohort | **Chọn — P1 sau release** |
| 3 | Track B timeout code | Giảm unknown access | Phạm vi rộng; ethics review; không phải desktop UX | P2 — plan riêng |
| 4 | Extension parity + dashboard | Một codebase detector | PRODUCT: desktop là design target; defer OK | P3 |
| 5 | LLM v2 classify | FN trên ok+inconclusive | Sai gate (unknown empty); cost/complexity | Reject v1 path |
| 6 | Commit hết plans/reports dirty | Dễ | Noise; không phải deliverable khách | Reject |

---

## 5. Phạm vi triển khai tiếp theo (đề xuất)

Plan chi tiết: [`plans/260826-0909-next-deployment-scope/plan.md`](../260826-0909-next-deployment-scope/plan.md)

### Wave 1 — Desktop customer complete (P0, ~0.5–1d)

**Mục tiêu:** Khách Windows/Linux nhận bản phản ánh đúng PRODUCT operating context.

| Task | Acceptance |
|------|------------|
| Land uncommitted desktop delta (renderer, main IPC, e2e, docs) | `npm test` + `npm run test:desktop:e2e` green |
| Code review disposition: boot stamp row, historical count pills | Document open items or fix if trivial |
| Bump `1.0.10` + release notes | package.json, README, desktop-windows.md |
| `desktop:pack:win` + optional linux | Artifact in dist-desktop/ |
| Win VM smoke: Start→Stop→Resume→Mở CSV **job đang chọn** | Checklist signed |

**Non-goals Wave 1:** Bật network-evidence trên job 10k; refactor engine; English UI.

### Wave 2 — Plan hygiene & extension gate (P1, ~0.5d)

| Task | Acceptance |
|------|------------|
| Close/update plan `260812-0939` → completed | Phases match 1.0.10 |
| Extension manual golden: `design` query → verify-golden | 4/4 affiliate-high or documented exception |
| Archive stale plan frontmatter (260813-0816 pending) | Status reflects code-only close |

### Wave 3 — Quality evidence Track A (P1, ~1–2d, copy cohort only)

Theo gates G2–G6 (`redteam-260813-0900`):

| Gate | Pass evidence |
|------|---------------|
| Fixed ≤80 domain sample from merge | `track-a-none-ok-sample-domains.txt` |
| Control vs `--network-evidence` separate `--out` | Metrics report A2 |
| Decision: enable default OFF vs opt-in doc only | Written recommendation |

**Không** claim unknown%↓ từ Track A.

### Wave 4 — Track B access-unknown (P2, plan riêng)

- Ops: runbook windows trên ≥500 rows mới
- Nếu access-unknown% flat → slug mới: timeout/goto budget code
- Target: B1 ≤20% access-unknown **không** tăng concurrency

### Backlog (undecided / v2)

- Code signing (Windows SmartScreen)
- English localization
- Extension CLI parity
- LLM on ok+inconclusive subset only

---

## 6. Rủi ro & false claims cần tránh

| Claim | Thực tế |
|-------|---------|
| "Dự án xong" | Extension live golden + Track A lift + Track B chưa đóng |
| "Quality upgrade đã ship" | Code shipped; lift unmeasured |
| "Desktop hoàn hảo trên main" | 1.0.9 thiếu IPC selected-job; fix in working tree |
| "Giảm unknown bằng network-evidence" | unknown = blocked/timeout; metric lie |
| "1.0.9 đã có workspace đầy đủ" | Thiếu chọn job khi quét + CSV theo selection (fixed in diff) |

---

## 7. Metrics hiện tại (test/ops)

| Signal | Value | Date |
|--------|-------|------|
| Unit tests | 152/152 pass | 2026-08-26 |
| Desktop e2e | 9 pass, 1 skip (packaged linux) | 2026-08-26 |
| Desktop version (main) | 1.0.9 | commit c84aea6 |
| Uncommitted files | 12 (desktop + docs + e2e) | git diff |
| tsc --noEmit | 29 errors pre-existing | not blocking vitest |

---

## 8. Handoff — hành động ngay

1. **User quyết định:** merge + tag `v1.0.10` desktop delta (recommended GO).
2. Chạy Win smoke checklist trước GitHub release.
3. Spin Wave 3 A/B chỉ sau Wave 1 ship — không trộn vào cùng PR.
4. Re-check `out/design-full-10k` nếu ops job vẫn active.

---

**STATUS: DONE** — brainstorm + next scope defined; Wave 1 ready (uncommitted delta tested).
