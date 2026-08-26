---
type: ops-checklist
date: 2026-08-26
scope: desktop 1.0.10 — Win VM smoke (gate before tag)
status: pending-manual
---

# Win VM Smoke Checklist — v1.0.10

**Gate:** Required before `git tag v1.0.10 && git push origin v1.0.10`

**Artefact:** Install from CI release after tag, or dev build from `main` @ `5de372e+`.

## Environment

- [ ] Windows 10/11 VM
- [ ] Google Chrome installed (system)
- [ ] NSIS installer from GitHub Release `v1.0.10` OR `npm run desktop:pack:win` on Windows host

## Checklist

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Mở app, tạo **Job mới** hoặc chọn job có sẵn | Bảng job + preview hiện | |
| 2 | Nhập từ khoá + limit nhỏ (vd 5), **Bắt đầu** | Progress chạy, ETA hiện | |
| 3 | **Dừng** giữa chừng | CSV xuất từ jsonl; state idle | |
| 4 | Chọn **job khác** trên bảng (nếu có) | `#out` đổi theo job chọn | |
| 5 | **Tiếp tục** job đã dừng (bước 2) | Resume cùng thư mục | |
| 6 | Trong khi job A đang quét: chọn job B | `liveJobNote` hiện; Start/Resume khoá | |
| 7 | **Mở CSV** khi job B đang chọn | Mở `results.csv` của **B**, không phải A | |
| 8 | **Mở thư mục job** job B | Explorer mở đúng folder B | |
| 9 | **Dừng** khi preview đang xem B | Dừng job A (live), không start B | |
| 10 | Sau Stop: `#out` vẫn ở B (nếu đã browse away) | Không snap về A | |

## Sign-off

- Tester: ___________
- Date: ___________
- Result: PASS / FAIL
- Notes:
