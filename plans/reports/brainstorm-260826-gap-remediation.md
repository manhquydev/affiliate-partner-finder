---
type: brainstorm
date: 2026-08-26
scope: gap remediation after plan 260826 CTO closeout
---

# Brainstorm — Xử lý lỗi & thiếu sót (260826)

## Brainstorm contract

| Field | Content |
|-------|---------|
| **Outcome** | Đóng các gap **có thể implement** trong repo; giữ release 1.0.10 an toàn; human gates còn lại có hướng rõ, không bypass được. |
| **Constraints** | RT-1 smoke-before-tag; không tag/release giả; không mở rộng Track A/B hay extension live trong wave này; Linux dev không wine pack. |
| **Non-goals** | Chạy Win VM thay user; push tag v1.0.10; extension golden live; Track A/B measurement; code signing. |
| **Acceptance** | Gate script có test tự động; CI refuse v1.0.10 release khi chưa `- Result: PASS`; checklist không còn chicken-and-egg; báo cáo trung thực gap còn human. |

## Gap inventory (trung thực)

| # | Gap | Loại | Xử lý |
|---|-----|------|-------|
| G1 | Release gate khớp nhầm template `PASS / FAIL` | **Bug — đã sửa** | Commit `4bb784e` + test + shared check script |
| G2 | `workflow_dispatch` bypass smoke | **Bug CI** | Step enforce trên job `release` khi tag = v1.0.10 |
| G3 | Checklist yêu cầu NSIS từ release **trước** khi tag | **Doc logic** | Sửa: dev pack Win trước, CI NSIS sau tag |
| G4 | Win VM smoke 10 bước HITL | **Human** | Không implement — checklist + gate |
| G5 | Tag + GitHub Release 1.0.10 | **Human sau G4** | `release-v1.0.10-gate.sh` → push tag |
| G6 | Extension live golden | **Human/env** | PARTIAL defer — ngoài wave desktop P0 |
| G7 | Track A/B | **Ops defer** | Slug riêng khi có merge CSV |
| G8 | Plan phase status lệch | **Doc** | Sync trong commit gate fix |
| G9 | Herdr OMP timeout | **Process** | Không fix code — dùng Task/PR trực tiếp |

## Approaches (material choices)

### G4 — Win smoke

| Approach | Trade-off |
|----------|-----------|
| **A. Human checklist only (chọn)** | Đúng PRODUCT (Cloudflare, Explorer, tiếng Việt UX). Release vẫn blocked đến khi ops ký. |
| B. CI Windows e2e thay smoke | Chạy được headless; **không** cover Mở CSV/Explorer/HITL — false confidence. |
| C. workflow_dispatch rc tag | Tạo release/tag sớm — vi phạm RT-1. |

### G1/G2 — Gate enforcement

| Approach | Trade-off |
|----------|-----------|
| **A. Shared script + unit test + CI step (chọn)** | Nhỏ, một nguồn sự thật; CI fail nếu ai push tag mà chưa commit PASS. |
| B. Chỉ local script | Dễ bypass qua workflow_dispatch hoặc tag từ máy khác. |
| C. GitHub Environment approval | Cần repo settings; overkill cho solo ops. |

## Recommendation

**Wave ngắn — “release safety hardening”:**

1. `scripts/check-win-smoke-signoff.sh` — dùng chung local + CI  
2. `test/release-gate.test.ts` — 4 case (pending, template, pending text, PASS)  
3. CI `release-desktop.yml` — refuse upload release v1.0.10 without PASS  
4. Sửa smoke checklist artefact order  
5. Push commit gate fix (`4bb784e`) + hardening lên `origin/main`

**Sau wave (human only):**

```text
Win VM → sửa test-260826-win-smoke-110.md (- Result: PASS) → commit → gate script → push tag
```

## Unresolved (không che)

- Khách hàng **vẫn trên v1.0.9** cho đến khi G4+G5 xong.  
- Extension v1 phase-5 checkbox vẫn mở.  
- Track A chưa có số liệu A/B.

## Handoff

→ Implement trong session này (test + CI + docs).  
→ `/ak:cook` **không cần** cho desktop feature mới.  
→ Human: Win smoke là blocker duy nhất cho product release.
