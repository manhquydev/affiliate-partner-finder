# Quy trình phát hành Desktop (an toàn)

Quy trình **3 lớp** trước khi giao NSIS/AppImage cho khách hoặc đánh tag `v*`.

## Tóm tắt

| Lớp | Ai chạy | Mục tiêu | Pass khi |
|-----|---------|----------|----------|
| **A — Automated** | Dev / CI | Regression unit + e2e + argv win32 | `npm run desktop:validate` exit 0 |
| **B — CI Release** | GitHub Actions | Build Win+Linux, e2e trên runner | Workflow `Release Desktop` success |
| **C — HITL Win VM** | Người vận hành | UX thật, SmartScreen, CSV, probe-parallel | Checklist `- Result: PASS` |

**Không bỏ qua C** nếu claim “customer-ready Windows” — CI không thay được cài NSIS + Start/Stop trên máy khách.

---

## Lớp A — Automated (mọi OS)

```bash
npm run desktop:validate
```

Chạy:

1. `npm test` (179+ tests, gồm desktop-adapter win32 + cli guards)
2. `npm run test:track-s`
3. `npm run test:desktop:e2e` (xvfb trên Linux nếu có)
4. Invariant: `#probeParallel` **không** `checked` trong HTML
5. Subset `win32` argv tests

**Khi nào chạy:** sau mỗi thay đổi desktop/CLI scan; trước PR; trước Lớp C.

---

## Lớp B — CI (GitHub)

1. Push `main` → workflow **CI** (unit + Linux e2e)
2. (Tuỳ chọn) **Desktop Pack Preview** — artefact NSIS 14 ngày, chưa tag
3. Tag `vX.Y.Z` → **Release Desktop**:
   - `test-e2e` ubuntu + **windows-latest**
   - Build NSIS + AppImage + deb
   - Upload GitHub Release

**v1.0.11 evidence:** run [33036233264](https://github.com/manhquydev/affiliate-partner-finder/actions/runs/33036233264) — Win+Linux PASS.

---

## Lớp C — HITL Windows VM

Checklist: [`plans/reports/test-260827-win-smoke-111.md`](../plans/reports/test-260827-win-smoke-111.md)

1. Tải NSIS từ [Releases v1.0.11](https://github.com/manhquydev/affiliate-partner-finder/releases/tag/v1.0.11) (hoặc artefact Pack Preview)
2. Cài trên **Windows 10/11** + **Google Chrome** hệ thống
3. Làm đủ bước 1–12 (gồm **Quét đường dẫn song song** tắt + bật thử)
4. Điền sign-off: `- Result: PASS` hoặc `FAIL`

Gate trước tag **tiếp theo**:

```bash
scripts/release-desktop-gate.sh 1.0.12 plans/reports/test-....md
```

(yêu cầu checklist PASS + `desktop-validate` green)

---

## Desktop vs CLI (Track S)

| Tính năng | Desktop | Ghi chú |
|-----------|---------|---------|
| `--probe-parallel` | Checkbox, default OFF | `buildScanArgv` → bundled CLI |
| Isolation `newPage` | Có | Luôn `--scan-profile` |
| `--profile-timing` | Không | Chỉ CLI ops |

Spawn: `shell: false`, argv array — tránh lỗi quoting Windows.

---

## Rủi ro còn lại sau A+B

- SmartScreen (unsigned)
- Đường dẫn `%LOCALAPPDATA%` / Documents thật
- Cloudflare HITL một lần trên profile app
- Hành vi probe-parallel trên site thật (chỉ khi bật checkbox)

---

## Tham chiếu

- Khách hàng: [`desktop-windows.md`](./desktop-windows.md)
- Ship report: [`plans/reports/ship-v1.0.11-track-s.md`](../plans/reports/ship-v1.0.11-track-s.md)
- Metrics A/B: [`plans/reports/metrics-track-s-ab.md`](../plans/reports/metrics-track-s-ab.md)
