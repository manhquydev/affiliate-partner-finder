---
type: ops-checklist
date: 2026-08-31
scope: desktop 1.0.12 — Win VM HITL (customer-ready gate)
status: pending-hitl
version: 1.0.12
---

# Win VM Smoke Checklist — v1.0.12

**Mục tiêu:** Xác nhận NSIS 1.0.12 trên Windows thật sau cửa sổ hide-chrome / profile-lock / stagger.

**Automated substitute (không thay HITL nếu claim customer-ready):**

| Evidence | Where | Result |
|----------|-------|--------|
| Windows-parity | `npm run test:windows-parity` | run before tag |
| CI windows-latest | workflow CI job `windows-parity` | after push |
| `#probeParallel` default OFF | `test/windows-parity.test.ts` | locked |
| win32 User Data reject | `assertSafeJobPaths` | locked |

## Environment (HITL — điền khi test)

- [ ] Windows 10 hoặc 11 (ghi build: _____________)
- [ ] Google Chrome cài sẵn (không dùng profile Chrome cá nhân)
- [ ] NSIS từ Release v1.0.12 (hoặc Pack Preview)
- [ ] SmartScreen: ghi nhận hành vi

## Checklist HITL

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Cài NSIS, mở app | Cửa sổ workspace, không crash | [ ] |
| 2 | Job mới + từ khoá `design` + limit 5 | Preview đúng | [ ] |
| 3 | **Không** bật Quét đường dẫn song song | Checkbox **tắt** mặc định | [ ] |
| 4 | Bắt đầu (Ẩn Chrome bật) | Tiến độ chạy; Chrome không chiếm desktop | [ ] |
| 5 | Dừng | CSV partial | [ ] |
| 6 | Tiếp tục cùng thư mục | Resume không lỗi profile lock | [ ] |
| 7 | Mở CSV / thư mục job | Đúng Documents\\…\\runs | [ ] |
| 8 | Cloudflare (nếu gặp): tắt Ẩn Chrome, vượt 1 lần, Tiếp tục | Resume OK | [ ] |
| 9 | Profile app không phải Chrome User Data | `%LOCALAPPDATA%\\affiliate-partner-finder\\chrome-profile` | [ ] |

## Sign-off

- Tester: ____________________
- Date: ____________________
- Result: _pending_ (thay bằng đúng một dòng: `- Result: PASS` hoặc `- Result: FAIL`)
- Notes:
