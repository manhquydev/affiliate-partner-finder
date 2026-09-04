# Desktop app — Windows (khách hàng)

Ứng dụng GUI bọc CLI quét affiliate/partner. Dữ liệu ở máy bạn.

**Phiên bản mã nguồn (`main`):** `1.0.15`.

**Bản tải trên [GitHub Releases](https://github.com/manhquydev/affiliate-partner-finder/releases):** **`v1.0.15`** (Latest) — NSIS + AppImage + `.deb`.

## Yêu cầu

- Windows 10/11 (bản NSIS); Linux có AppImage / `.deb` trên cùng trang Releases
- **Google Chrome** đã cài (bắt buộc — dùng profile riêng của app, không đụng Chrome cá nhân)
- Bản cài đặt app (NSIS / portable / AppImage) **hoặc** bản dev từ repo

## Tải bản phát hành

1. Mở https://github.com/manhquydev/affiliate-partner-finder/releases
2. Chọn tag **Latest** (`v1.0.15`)
3. Tải:
   - **Windows:** `Affiliate Partner Finder Setup *.exe` (NSIS)
   - **Linux:** `*.AppImage` hoặc `*_amd64.deb`
4. Windows có thể hiện SmartScreen (bản chưa ký) — “More info” → Run anyway (internal / tự chịu rủi ro).

### Bản preview trước release (Win smoke)

Trước khi có tag trên Releases, tải installer từ **GitHub Actions**:

1. [Actions](https://github.com/manhquydev/affiliate-partner-finder/actions) → workflow **Desktop Pack Preview** (chạy tự sau **CI** xanh trên `main`, hoặc **Run workflow** thủ công).
2. Mở run → **Artifacts** → `desktop-win-preview` (NSIS `.exe`).
3. Dùng file này cho checklist `plans/reports/test-260831-win-smoke-112.md`. **Không** thay thế tag/release chính thức.

## Dev (máy lập trình)

```bash
npm install
npm run desktop:dev
```

## Cách dùng

1. Cửa sổ là **workspace job**: bảng job (trái; cửa sổ hẹp thì phía trên) và **preview** của job đang chọn. **Job mới** / **Chọn thư mục…** / click một dòng để chọn job. **Lấy danh sách**, **Bắt đầu** và **Tiếp tục** luôn dùng job đang chọn, không phải job lần chạy trước. Khi một việc đang chạy, vẫn chọn job khác để xem hoặc tạo **Job mới**; **Lấy danh sách / Bắt đầu / Tiếp tục** khoá đến khi việc hiện tại xong hoặc **Dừng**. Chỉ một việc tại một thời điểm (chung Chrome profile).
2. Trong preview: nhập **từ khoá Trustpilot** + số website (`10000`, không gõ `10.000`). **Lấy danh sách** (nút chính) chỉ ghi CSV Trustpilot (`companies.csv`, cột `stt,ten_website,link`); **Bắt đầu** lấy danh sách rồi quét affiliate. Lúc lấy danh sách thanh hiện **đã lấy / số yêu cầu**; lúc quét website mới hiện **đã quét / số đã lấy**. Nếu Trustpilot hết kết quả hoặc bị chặn, app không bịa thêm website.
3. Theo dõi tiến độ, **ETA** (ẩn khi job tạm dừng >8 phút hoặc tốc độ quá thấp), và đếm Có chương trình / Không có / Chưa rõ khi job đó đang (hoặc vừa) quét website trên máy.
4. **Ẩn cửa sổ Chrome** mặc định bật. **Cài đặt quét website** (Tăng tốc / Dừng sớm / Kiểm tra mạng / Chờ tải linh hoạt / Quét đường dẫn song song) nằm trong mục thu gọn — không cần khi chỉ Lấy danh sách. **Cài đặt** trên thanh lệnh hiện phiên bản app / bộ dò / Electron để tra soát.
5. Nếu Trustpilot/Cloudflare chặn khi đang ẩn Chrome: **tắt** Ẩn cửa sổ Chrome → **Lấy danh sách lại** (hoặc **Tiếp tục** nếu đã có danh sách) → vượt kiểm tra một lần trong cửa sổ Chrome → có thể bật lại.
6. Nếu Chrome hiện Cloudflare: hoàn thành **một lần** trong cửa sổ Chrome của app → **Tiếp tục** nếu việc đã dừng.
7. **Dừng** = dừng an toàn (SIGINT) + xuất CSV từ kết quả đã có; lần sau **Tiếp tục** cùng thư mục.
8. Preview hiện từng file của **job đang chọn**: `companies.csv` (danh sách), `results.csv` (kết quả quét: `ten_cong_ty,website,ket_qua,huong_dan`), `results.full.csv` (CSV kỹ thuật). **Dừng** luôn dừng việc đang chạy trên máy, kể cả khi preview đang mở job khác.

## Quy tắc an toàn

- Không trỏ profile vào `Google\Chrome\User Data`.
- Không Lấy danh sách / Bắt đầu vào thư mục đã có danh sách (`companies.json` không rỗng) — dùng Tiếp tục hoặc thư mục mới. Job lấy 0 website không bị kẹt: chạy Lấy danh sách lại trên cùng thư mục.
- Không chạy song song với job CLI khác cùng profile.
- Không bypass CAPTCHA.

## Đóng gói (internal)

```bash
npm run desktop:prepare-pack
npm run desktop:pack:win    # NSIS → dist-desktop/
npm run desktop:pack:linux  # AppImage + deb
```

CI: ba workflow GitHub Actions:

| Workflow | Khi nào chạy | Mục đích |
|----------|--------------|----------|
| **CI** | Mỗi push/PR `main` | `npm test` + e2e Linux |
| **Desktop Pack Preview** | Sau CI xanh trên `main`, hoặc dispatch | NSIS/AppImage **artifact** (14 ngày) — dùng Win smoke **trước** tag |
| **Release Desktop** | Push tag `v*` (sau smoke PASS) | Test Win+Linux → publish [Releases](https://github.com/manhquydev/affiliate-partner-finder/releases) |

Release `v1.0.15` dùng workflow **Release Desktop** (tag `v*`). Quy trình: A + **A2 Windows-parity** + B + C — [`docs/desktop-release-workflow.md`](./desktop-release-workflow.md), [`docs/windows-parity.md`](./windows-parity.md). Checklist HITL Windows vẫn `plans/reports/test-260831-win-smoke-112.md` (chưa sign-off cho 1.0.15).

Xem `desktop/electron-builder.yml` + `npm run desktop:bundle-cli`. Bản unsigned có thể bị SmartScreen cảnh báo — signing là bước sau. Gate khách hàng: một lần smoke trên Win VM (Start → Stop → Resume → mở CSV).

## Ops Linux

Trên Linux desktop, mặc định **"Ẩn cửa sổ Chrome khi quét (Xvfb)"** (bật sẵn) — job tái sử dụng `--virtual-display` của CLI nên Chrome headed chạy trên display ảo, không chiếm màn hình chính. Nếu Trustpilot chặn khi chạy ẩn: **tắt tùy chọn đó**, bấm Tiếp tục, vượt kiểm tra một lần trong cửa sổ Chrome (cookie lưu vào profile), rồi bật lại. CLI + `--virtual-display` vẫn dùng cho overnight; **không** dùng chung `--out`/`--profile` với desktop smoke. Chi tiết flag CLI: `README.md` (Lazy settle / Network evidence).
