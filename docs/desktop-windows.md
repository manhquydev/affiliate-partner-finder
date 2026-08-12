# Desktop app — Windows (khách hàng)

Ứng dụng GUI bọc CLI quét affiliate/partner. Dữ liệu ở máy bạn.

## Yêu cầu

- Windows 10/11
- **Google Chrome** đã cài (bắt buộc — dùng profile riêng của app, không đụng Chrome cá nhân)
- Bản cài đặt app (NSIS / portable) **hoặc** bản dev từ repo

## Dev (máy lập trình)

```bash
npm install
npm run desktop:dev
```

## Cách dùng

1. Nhập từ khoá Trustpilot + số công ty + thư mục lưu (mặc định trong Documents\AffiliatePartnerFinder\runs).
2. **Bắt đầu** — thu thập + quét. Theo dõi tiến độ / true·false·unknown trên màn hình.
3. Nếu Chrome hiện Cloudflare: hoàn thành **một lần** trong cửa sổ Chrome của app → **Tiếp tục** nếu việc đã dừng.
4. **Dừng** = dừng an toàn (SIGINT) + xuất CSV từ kết quả đã có; lần sau **Tiếp tục** cùng thư mục.
5. **Mở CSV** → `results.csv` cột `ten_cong_ty,website,ket_qua,huong_dan`.

## Quy tắc an toàn

- Không trỏ profile vào `Google\Chrome\User Data`.
- Không Start vào thư mục đã có `companies.json` — dùng Tiếp tục hoặc thư mục mới.
- Không chạy song song với job CLI khác cùng profile.
- Không bypass CAPTCHA.

## Đóng gói (internal)

Xem `desktop/electron-builder.yml` + `npm run desktop:bundle-cli`. Bản unsigned có thể bị SmartScreen cảnh báo — signing là bước sau. Gate khách hàng: một lần smoke trên Win VM (Start → Stop → Resume → mở CSV).

## Ops Linux

CLI + `--virtual-display` vẫn dùng cho overnight; **không** dùng chung `--out`/`--profile` với desktop smoke.
