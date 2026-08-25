# Desktop app — Windows (khách hàng)

Ứng dụng GUI bọc CLI quét affiliate/partner. Dữ liệu ở máy bạn.

**Phiên bản hiện tại:** `1.0.9` (xem [GitHub Releases](https://github.com/manhquydev/affiliate-partner-finder/releases)).

## Yêu cầu

- Windows 10/11 (bản NSIS); Linux có AppImage / `.deb` trên cùng trang Releases
- **Google Chrome** đã cài (bắt buộc — dùng profile riêng của app, không đụng Chrome cá nhân)
- Bản cài đặt app (NSIS / portable / AppImage) **hoặc** bản dev từ repo

## Tải bản phát hành

1. Mở https://github.com/manhquydev/affiliate-partner-finder/releases
2. Chọn tag mới nhất (vd `v1.0.9`)
3. Tải:
   - **Windows:** `Affiliate Partner Finder Setup *.exe` (NSIS)
   - **Linux:** `*.AppImage` hoặc `*_amd64.deb`
4. Windows có thể hiện SmartScreen (bản chưa ký) — “More info” → Run anyway (internal / tự chịu rủi ro).

## Dev (máy lập trình)

```bash
npm install
npm run desktop:dev
```

## Cách dùng

1. Cửa sổ là **workspace job**: bảng job (trái; cửa sổ hẹp thì phía trên) và **preview** của job đang chọn. **Job mới** / **Chọn thư mục…** / click một dòng để chọn job. **Bắt đầu** và **Tiếp tục** luôn dùng job đang chọn, không phải job lần chạy trước.
2. Trong preview: nhập **từ khoá Trustpilot** + số công ty (`10000`, không gõ `10.000`). Lúc lấy danh sách thanh hiện **đã lấy / số yêu cầu**; lúc quét website mới hiện **đã quét / số đã lấy**. Nếu Trustpilot hết kết quả hoặc bị chặn, app không bịa thêm công ty.
3. Theo dõi tiến độ, **ETA** (ẩn khi job tạm dừng >8 phút hoặc tốc độ quá thấp), và đếm Có chương trình / Không có / Chưa rõ khi job đó đang (hoặc vừa) chạy trên máy.
4. **Tùy chọn quét** (thu gọn; mặc định **không** tick trừ Ẩn Chrome):
   - **Early-exit** — bỏ path-probe khi trang chủ đã có tín hiệu mạnh
   - **Network evidence** — bắt host affiliate từ request/response (`--network-evidence`)
   - **Lazy settle** — scroll + MutationObserver thay chờ cố định 1.2s (`--lazy-settle`)
   - Chỉ bật khi đo recall trên trang tải được; **không** kỳ vọng giảm `unknown` (unknown = blocked/timeout/error).
5. Mặc định **Ẩn cửa sổ Chrome khi quét** (Windows: thu nhỏ / đưa ra ngoài màn hình, Chrome vẫn headed). Nếu Trustpilot/Cloudflare chặn: **tắt** tùy chọn đó → **Tiếp tục** → vượt kiểm tra một lần trong cửa sổ Chrome → có thể bật lại.
6. Nếu Chrome hiện Cloudflare: hoàn thành **một lần** trong cửa sổ Chrome của app → **Tiếp tục** nếu việc đã dừng.
7. **Dừng** = dừng an toàn (SIGINT) + xuất CSV từ kết quả đã có; lần sau **Tiếp tục** cùng thư mục.
8. **Mở CSV** / **Mở thư mục job** mở artefact của **lần chạy trên máy** (`results.csv` cột `ten_cong_ty,website,ket_qua,huong_dan`). Nếu đang xem job khác trên bảng, hai nút đó tắt — chọn lại job vừa chạy, hoặc **Tiếp tục** job đang chọn.

## Quy tắc an toàn

- Không trỏ profile vào `Google\Chrome\User Data`.
- Không Start vào thư mục đã có `companies.json` — dùng Tiếp tục hoặc thư mục mới.
- Không chạy song song với job CLI khác cùng profile.
- Không bypass CAPTCHA.

## Đóng gói (internal)

```bash
npm run desktop:prepare-pack
npm run desktop:pack:win    # NSIS → dist-desktop/
npm run desktop:pack:linux  # AppImage + deb
```

CI: workflow `.github/workflows/release-desktop.yml` — push tag `v*` hoặc `workflow_dispatch` với tag (vd `v1.0.9`).

Xem `desktop/electron-builder.yml` + `npm run desktop:bundle-cli`. Bản unsigned có thể bị SmartScreen cảnh báo — signing là bước sau. Gate khách hàng: một lần smoke trên Win VM (Start → Stop → Resume → mở CSV).

## Ops Linux

Trên Linux desktop, mặc định **"Ẩn cửa sổ Chrome khi quét (Xvfb)"** (bật sẵn) — job tái sử dụng `--virtual-display` của CLI nên Chrome headed chạy trên display ảo, không chiếm màn hình chính. Nếu Trustpilot chặn khi chạy ẩn: **tắt tùy chọn đó**, bấm Tiếp tục, vượt kiểm tra một lần trong cửa sổ Chrome (cookie lưu vào profile), rồi bật lại. CLI + `--virtual-display` vẫn dùng cho overnight; **không** dùng chung `--out`/`--profile` với desktop smoke. Chi tiết flag CLI: `README.md` (Lazy settle / Network evidence).
