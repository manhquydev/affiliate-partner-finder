# 07 — Test Plan (Nhiều vòng, có kết quả thật làm baseline)

## 1. Chiến lược
Test theo 4 vòng như đã thực hiện thủ công, dùng chính các site đã kiểm chứng làm **golden set** để regression.

## 2. Golden set (kết quả kỳ vọng — đã verify thật)
| Domain | Kỳ vọng verdict | Bằng chứng mong đợi |
|---|---|---|
| vecteezy.com | affiliate/high | link "Affiliate Program" /affiliates + path 200 |
| nordicnest.se | affiliate/high | link /om-oss/affiliate/ |
| designbyamor.com | affiliate/high | outbound uppromote |
| design-bestseller.de | affiliate/high | "Partnerprogramm" + outbound awin |
| madeindesign.com | partner_trade/medium | path /partenaires.html 200 |
| williamwoodmirrors.co.uk | partner_trade/(low-med) | "Trade"/"Partner With Us", /pages/trade 200 |
| ozdesignfurniture.com.au | partner_trade/low | "trade-commercial" |
| namly.dk | none/high | không hit, junk 404 |
| finnishdesignshop.com | none/high | không hit |
| thorvalddesign.com | none/high | redirect .co.uk, không hit |
| mohd.it | partner_trade/low | "Trade & Professionals" → /en/trade-and-professionals/ (canonical trade-program). Date 2026-08-27. Not affiliate. |
| pazzodesign.it | none/high | không hit |
| flinders.nl | unknown/blocked | Cloudflare chặn |

## 3. Vòng test
- **Vòng 1 — Collect**: fetch /search page 1..3, assert parse được ≥10 company/trang, có domain.
- **Vòng 2 — Load/Block**: mở 13 site, assert phân loại đúng ok/blocked (flinders=blocked).
- **Vòng 3 — Detector**: chạy detector, so verdict với golden set. Chấp nhận sai lệch confidence ±1 mức; verdict phải khớp cho các ca high.
- **Vòng 4 — Anti-hallucination**: 
  - Inject site giả soft-404 (mọi path 200) → assert path-probe bị vô hiệu, không tạo false affiliate.
  - Site blocked → assert KHÔNG trả none.
  - Site 404 body nặng → assert dùng status, verdict none.

## 4. Unit tests (classify)
- strong link → affiliate/high.
- platform outbound only → affiliate/high.
- weak only → partner_trade.
- junkStatus==200 → path-probe disabled.
- loadStatus blocked → unknown.

## 5. Tiêu chí pass
- 4/4 ca affiliate-high khớp verdict.
- 0 ca blocked bị gán none.
- 0 false-affiliate trên 4 ca none.
- Mọi `confirmed` có evidenceUrl mở được (HTTP < 400).

## 6. Regression
Chạy lại golden set định kỳ; nếu 1 site đổi cấu trúc (vd bỏ affiliate), cập nhật golden + ghi chú ngày.

## 7. Trạng thái verify (v1 build)
- **Tự động (đã xanh):** `npm test` — classify() phủ đủ 6 dòng bảng quyết định + toàn bộ golden set (`test/fixtures/golden.ts`), detector (jsdom), path-probe soft-404 guard, export columns. 44/44 pass.
- **Bằng script:** `node test/verify-golden.mjs <exported.json> [--check-urls]` — so verdict một lần chạy thật với golden set + đánh giá 4 tiêu chí §5. Đã tự-kiểm trên dữ liệu tổng hợp: PASS.
- **Live e2e (thủ công):** load unpacked `.output/chrome-mv3/`, chạy query `design`, Export JSON, chạy verify script. Đây là bước acceptance cuối cần môi trường Chrome thật + mạng (site có thể đã đổi cấu trúc so với lần chụp docs 2026-08-10 → cập nhật golden nếu lệch, đừng ép verdict).
