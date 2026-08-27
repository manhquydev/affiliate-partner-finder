---
type: ops-checklist
date: 2026-08-27
scope: desktop 1.0.11 — Win VM HITL (customer-ready gate)
status: pending-hitl
version: 1.0.11
release: https://github.com/manhquydev/affiliate-partner-finder/releases/tag/v1.0.11
ci_release_run: 33036233264
---

# Win VM Smoke Checklist — v1.0.11

**Mục tiêu:** Xác nhận NSIS 1.0.11 an toàn trên Windows thật — gồm **Quét đường dẫn song song** (opt-in).

**Automated substitute (đã PASS — không thay HITL nếu claim customer-ready):**

| Evidence | Run | Result |
|----------|-----|--------|
| Unit + e2e Linux | CI release 33036233264 | success |
| Unit + e2e Windows | CI release 33036233264 | success |
| NSIS build | Release v1.0.11 assets | Affiliate.Partner.Finder.Setup.1.0.11.exe |
| `#probeParallel` default OFF | test/desktop-electron.e2e.test.ts | covered |
| win32 argv + probe-parallel | test/desktop-adapter.test.ts | covered |
| Local gate | `npm run desktop:validate` | run before sign-off |

## Environment (HITL — điền khi test)

- [ ] Windows 10 hoặc 11 (ghi build: _____________)
- [ ] Google Chrome cài sẵn (không dùng profile Chrome cá nhân)
- [ ] NSIS từ Release v1.0.11 (hoặc Pack Preview artefact)
- [ ] SmartScreen: ghi nhận hành vi (More info → Run anyway nếu cần)

## Checklist HITL

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Cài NSIS, mở app | Cửa sổ workspace job hiện, không crash | [ ] |
| 2 | Job mới + từ khoá `design` + limit nhỏ (5) | Preview hiện đúng | [ ] |
| 3 | **Không** bật Quét đường dẫn song song | Checkbox **tắt** mặc định | [ ] |
| 4 | Bắt đầu quét (Ẩn Chrome bật) | Tiến độ chạy, ETA hoặc đếm | [ ] |
| 5 | Dừng | Dừng an toàn, có CSV partial | [ ] |
| 6 | Tiếp tục cùng thư mục | Resume không lỗi | [ ] |
| 7 | Mở CSV / Mở thư mục job (job đang chọn) | Đúng thư mục đã chọn | [ ] |
| 8 | Chọn job khác khi đang quét (nếu có job 2) | Bảng chọn được; Start khoá | [ ] |
| 9 | Bật **Quét đường dẫn song song** → Job mới → quét 3–5 site | Không crash; kết quả hợp lệ (true/false/unknown) | [ ] |
| 10 | So sánh: cùng site với bước 9 tắt/bật | Không có `blocked→none`; không đổi domain lạ trên CSV | [ ] |
| 11 | Cloudflare (nếu gặp): tắt Ẩn Chrome, vượt 1 lần, Tiếp tục | Resume OK | [ ] |
| 12 | Gỡ cài / cài lại (tuỳ chọn) | Profile app không trỏ User Data Chrome | [ ] |

## Probe-parallel notes (bước 9–10)

- Mặc định **tắt** — khách không bật thì hành vi giống 1.0.10 + isolation fix.
- Khi **bật**: throughput có thể nhanh hơn; gate chất lượng A/B đã đo CLI (n=61, 0 regression) — HITL chỉ cần không thấy lỗi vận hành rõ.

## Sign-off

- Tester: ____________________
- Date: ____________________
- Result: _pending_ (thay bằng đúng một dòng: `- Result: PASS` hoặc `- Result: FAIL`)
- Notes:

---

Sau PASS, có thể dùng:

```bash
scripts/release-desktop-gate.sh 1.0.11 plans/reports/test-260827-win-smoke-111.md
```

(cho tag **tiếp theo**; v1.0.11 đã release — checklist này xác nhận customer-ready.)
