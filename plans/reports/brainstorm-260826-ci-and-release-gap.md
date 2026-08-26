---
type: brainstorm
date: 2026-08-26
scope: CI visibility + release 1.0.10 gap
handoff: ak:cook
---

# Brainstorm — CI không chạy & Release chưa 1.0.10

## Vấn đề (chẩn đoán, có bằng chứng)

| Triệu chứng | Root cause | Loại |
|-------------|------------|------|
| Push `main` không thấy Actions | Chỉ có `release-desktop.yml`; trigger **tag `v*`** + **workflow_dispatch** | **Thiết kế thiếu**, không phải CI hỏng |
| Releases vẫn v1.0.9 | Không tag `v1.0.10`; smoke checklist `pending-manual` | **Gate có chủ đích** (RT-1) |
| Docs nói 1.0.10 nhưng tải được 1.0.9 | Release chưa tag; docs đã draft P0 fix **chưa commit** | Doc drift |
| `package-lock.json` lệch 1.0.9 | Bump `package.json` không sync lock | **Bug nhỏ** — P0 fix local chưa push |

**Hai vấn đề độc lập:**

1. **Quan sát chất lượng** — maintainer/khách không thấy CI khi merge → thiếu workflow test-on-push.
2. **Giao khách hàng** — binary 1.0.10 → vẫn cần human Win smoke + tag (cook **không** thay được).

## Brainstorm contract

| Field | Content |
|-------|---------|
| **Outcome** | Mỗi push/PR lên `main` có CI test xanh trên GitHub Actions; docs trung thực về Releases vs source; release 1.0.10 path không đổi (smoke → tag → Release Desktop). |
| **Constraints** | Giữ smoke-before-tag; không dispatch/tag v1.0.10 giả; tái dùng lệnh test hiện có; Linux xvfb cho e2e (pattern release workflow). |
| **Non-goals** | Win VM smoke thay user; tag/release 1.0.10 trong cook; Windows matrix mỗi push (tốn runner); refactor release workflow lớn; Track A/B. |
| **Acceptance** | Workflow `CI` chạy trên push `main` + PR; pass = 156 unit + 10 e2e; P0 docs committed; README/desktop-windows giải thích CI vs Release; sau merge user thấy run mới trên Actions tab. |

## Approaches — CI trên push `main`

| # | Approach | Assumption load-bearing | Fail first when |
|---|----------|-------------------------|-----------------|
| **A (khuyến nghị)** | `ci.yml` mới: `npm ci` → `npm test` → xvfb e2e **Linux only** | E2E đủ signal trên Ubuntu | Flake e2e hoặc thiếu xvfb deps |
| B | Matrix Linux + Windows mỗi push | Windows e2e bắt buộc trước merge | Chậm (~2× runner), quota |
| C | Chỉ document “CI = tag” | Maintainer chấp nhận im lặng trên main | User vẫn không thấy CI — **không giải quyết pain** |

**Khuyến nghị A:** nhỏ nhất, mirror job `test-e2e` linux trong release workflow; Windows e2e giữ cho release pipeline.

## Approaches — Release 1.0.10

| # | Approach | Verdict |
|---|----------|---------|
| A | Giữ gate: smoke PASS → `release-v1.0.10-gate.sh` → push tag | **Đúng plan** — cook không bypass |
| B | `workflow_dispatch v1.0.10` không smoke | **Từ chối** — đã block bằng `check-win-smoke-signoff.sh` |
| C | Pre-release artifact workflow (build only, no GitHub Release) | Hữu ích cho Win smoke **trước** tag — **wave 2 tuỳ chọn**, không P0 cook |

## Cook scope (wave đề xuất)

### Phase 1 — CI visibility (P0)

- Tạo `.github/workflows/ci.yml`:
  - `on: push branches [main], pull_request`
  - Job `test`: node 22, `npm ci`, `npm test`, xvfb e2e
  - `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1'`, `ELECTRON_DISABLE_SANDBOX: '1'`
- Commit + push P0 docs (`README`, `docs/desktop-windows.md`, `package-lock.json`)

### Phase 2 — Docs pipeline (P0)

- Thêm đoạn ngắn README hoặc `docs/desktop-windows.md`:
  - **CI** = test mỗi push main
  - **Release Desktop** = tag `v*` sau smoke → NSIS/AppImage lên Releases

### Phase 3 — Human (ngoài cook)

- Win VM smoke → `- Result: PASS` → gate script → `git push origin v1.0.10`

## Delivery flow (cook builds)

```text
ci.yml (push main/PR)
  └─ npm test (156) + e2e linux (10)

release-desktop.yml (tag v1.0.10 only, after smoke)
  └─ test-e2e [linux + windows]
  └─ build-win + build-linux
  └─ check-win-smoke-signoff (v1.0.10)
  └─ GitHub Release artefacts
```

## Risks

- E2e flake trên CI → đã có isolation fix PR #9; monitor run đầu.
- Cook merge không tạo Release — user phải hiểu tag vẫn manual.
- P0 docs local chưa trên remote — cook phải commit trước push.

## Handoff → `/ak:cook`

Implement Phase 1 + 2 only. Verify: push branch → Actions shows **CI** workflow green. Do not tag v1.0.10.

## Unresolved

- Ai chạy Win VM smoke và khi nào?
- Có cần wave 2 `desktop-pack-preview.yml` (artifact without release) để smoke trước tag?
