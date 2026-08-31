# Windows-parity test process

Quy trình kiểm thử **sát bản Windows** (NSIS + `win32` hide-Chrome). Không thay Layer C (HITL trên VM khách).

## Vì sao Linux unit không đủ

Trên Windows, desktop **không** `xvfb-run`. `--virtual-display` = Chrome headed off-screen + `--start-minimized`. Profile ở `%LOCALAPPDATA%\affiliate-partner-finder\chrome-profile`. Job spawn `shell: false` (đường dẫn có khoảng trắng). CI cũ chỉ chạy e2e Windows khi **tag**.

## Lớp A2 — `npm run test:windows-parity`

```bash
npm run test:windows-parity
```

| Bước | Linux (mô phỏng) | `windows-latest` (thật) |
|------|------------------|-------------------------|
| `tsc --noEmit` | bắt buộc | bắt buộc |
| hide-chrome win32 | không Xvfb re-exec; `--start-minimized` | cùng contract |
| argv + Documents / LOCALAPPDATA | path `C:\…` có space | path thật |
| cấm Chrome User Data | `Google\Chrome\User Data` | cùng regex |
| stagger / nav / Singleton* | handoff giống Win | cùng |
| Electron e2e | **bỏ qua** (dùng xvfb ở `desktop:validate`) | **chạy** |

## Lớp B — CI

Workflow **CI** (`push`/`PR` `main`):

1. `ubuntu-latest` — `npm test` + `windows-parity.sh` + e2e xvfb
2. `windows-latest` — `npm test` + `windows-parity.sh` (kèm e2e Electron)

Release tag `v*` vẫn build NSIS trên `windows-latest`.

## Lớp C — HITL Win VM (không thay)

Checklist: `plans/reports/test-260831-win-smoke-112.md`. Cần `- Result: PASS` trước khi claim customer-ready trên máy khách.

## Không làm

- Bật mặc định `--probe-parallel`
- Trỏ profile vào Chrome cá nhân
- Coi A2 PASS là đã thay smoke NSIS trên VM
