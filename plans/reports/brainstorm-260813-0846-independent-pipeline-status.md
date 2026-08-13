# Brainstorm (độc lập): tình trạng APF + bước pipeline tiếp

**Timestamp:** 2026-08-13 08:46 +07  
**Mode:** Independent assessment (không phụ thuộc narrative agent trước)

## Contract

| Field | Content |
|-------|---------|
| **Outcome** | Track A lên PR sạch; pipeline đóng vòng `ship → review-pr`; 10k không bị bật flag. |
| **Constraints** | Đang ở `main` → **phải tạo feature branch** (ak:ship abort nếu ship từ main). Chỉ stage file Track A. Herdr `cursor-agent --yolo`. Không đụng shard đang chạy (~20 CLI procs). |
| **Non-goals** | Gom desktop ETA + shard-monitor + đống plans/reports cũ vào cùng PR; bật `--network-evidence`/`--lazy-settle` trên design-full-10k; bump version/release desktop. |
| **Acceptance** | Branch + commit Track A + PR URL; `review-pr` report; GO merge hoặc MUST-FIX list. |

## Đánh giá độc lập (evidence)

| Area | State | Evidence |
|------|-------|----------|
| Track A code | **Ready** | network-hosts/collector, classify/export, CLI flags default OFF, settleLazy, verify-golden fixed |
| Tests | **PASS** | `test-260813-track-a.md` |
| Code review | **APPROVE_WITH_NITS** → MUST-FIX golden **đã fix** | `code-review-260813-track-a.md` + `verify-golden.mjs` |
| Plan | ~90% checkboxes; phase-04 measurement A/B **chưa** | không chặn merge flag-off |
| Working tree | **Bẩn / mixed** | ETA desktop, shard-monitor, nhiều reports unrelated |
| Git branch | **`main` tracking origin** | Ship trực tiếp = sai; cần `feat/…` |
| Ops 10k | **Đang chạy** | pgrep shard >0; giữ flag OFF |

## So sánh hướng

1. **Commit hết lên main** — Reject (ship policy + noise).  
2. **Một PR Track A only** — **Chọn**.  
3. **PR Track A + ETA** — Review khó hơn; ETA follow-up.  
4. **Chỉ để local** — Lãng phí gate đã PASS.

## Pipeline tiếp (điều phối)

```text
brainstorm (this) → branch → commit Track A → push PR
  → Herdr review-pr agent → report GO/NO-GO merge
  → (user merge) optional: ETA PR riêng; A/B metrics sau
```

## Risks

- Stage nhầm `scripts/shard-monitor-loop.sh` / ETA → pollute PR  
- Push khi remote diverged → fetch first  
- review-pr blocked on nits already fixed — cite golden fix

## Handoff

Execute ship path now (orchestrator + Herdr review-pr).
