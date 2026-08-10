# 03 — Technical Findings (Kết quả kiểm thử THẬT)

> Tất cả phát hiện dưới đây được **kiểm chứng trực tiếp trên trình duyệt**, không suy đoán. Dữ liệu thô: `data/test-results.json`.

## A. Trustpilot — cấu trúc & ràng buộc

### A1. robots.txt (đã đọc thật)
- `Disallow: /search` và `Disallow: /api/*` → **không crawl search/API server-side**.
- Chặn thẳng nhiều bot (Yandex, CCBot, anthropic-ai, ImagesiftBot...): `Disallow: /`.
- Kết luận: hướng backend crawler đối đầu trực tiếp với robots.txt.

### A2. Bot-check
- Trang `/search` hiển thị "Verifying your connection... Please wait while we verify your browser." rồi tự pass sau vài giây khi ở trong trình duyệt thật.

### A3. Dữ liệu có cấu trúc (điểm mấu chốt)
- Trang là **Next.js**, nhúng `<script id="__NEXT_DATA__">` chứa JSON đầy đủ.
- **Search page**: `props.pageProps.businessUnits[]` = danh sách công ty với `displayName`, `identifyingName` (chính là domain), `trustScore`, `numberOfReviews`. (`websiteUrl` = null ở cấp search.)
- **Review page** (`/review/{domain}`): `props.pageProps.businessUnit.websiteUrl` = URL website SẠCH (vd `https://www.flinders.nl`), kèm `similarBusinessUnits` để mở rộng.
- **Fetch trực tiếp** `/search?query=design&page=N` trả HTML **có kèm __NEXT_DATA__, status 200** → lấy toàn bộ danh sách nhiều trang mà không cần render/click. (Đã test page 1,2,3.)

### A4. Nút "Visit website"
- Trên review page, `<a>` "Visit website" có `href` trỏ THẲNG tới website công ty. Không cần click — đọc href/JSON là đủ.

## B. Ràng buộc trình duyệt

### B1. CORS (kiểm chứng quyết định kiến trúc)
- Từ context của 1 tab (origin madeindesign.com), `fetch` sang namly.dk / kossdesign.com / thorvalddesign.com → **cả 3 đều "TypeError: Failed to fetch"**.
- ⇒ Script/bookmarklet trong 1 tab KHÔNG thể đọc nội dung site khác. Bắt buộc: extension (host_permissions + background fetch, hoặc mở tab thật) hoặc backend.

### B2. Same-origin path-probe hoạt động
- Khi đang Ở TRÊN site đích, `fetch(sameOrigin + path)` chạy được → cho phép probe path.

## C. Detector — 3 cơ chế bổ sung nhau (mỗi cái bắt ca cái kia bỏ sót)

| Cơ chế | Bắt được ca | Bằng chứng thật |
|---|---|---|
| 1. Link-scan (anchor text + href, đa ngôn ngữ) | Affiliate link hiển thị trên trang | vecteezy "Affiliate Program", nordicnest `/om-oss/affiliate/`, design-bestseller "Partnerprogramm" |
| 2. Affiliate-platform outbound | Shop dùng nền tảng affiliate ngoài | designbyamor → `af.uppromote.com`, design-bestseller → `ui.awin.com` |
| 3. Path-probe + junk baseline | Trang affiliate KHÔNG link từ homepage | madeindesign `/partenaires.html` 200, williamwood `/pages/trade` 200 |

### C1. Chống soft-404 (chống ảo giác)
- Trước khi tin path-probe, probe 1 path RÁC ngẫu nhiên làm baseline.
- Kiểm chứng: namly.dk junk-path → 404 (body vẫn 695KB → KHÔNG được dựa vào độ dài body, phải dùng HTTP status). madeindesign junk `.html` → 404 còn `/partenaires.html` → 200 ⇒ status phân biệt chuẩn.
- Quy tắc: chỉ nhận path-hit khi `status !== junkBaselineStatus`.

### C2. Phân tầng strong vs weak
- `strong` keywords (affiliate/affiliation/affiliazione + platform outbound) ⇒ verdict **affiliate**.
- `weak` keywords (partner/trade/b2b/reseller/wholesale) ⇒ verdict **partner/trade** (cần review/AI v2).
- Bằng chứng: ozdesign "trade" (weak), williamwood "Trade"+"Partner With Us" (weak) — KHÔNG gộp thành affiliate.

## D. Kết quả tổng hợp mẫu 13 site (thật)
- Load OK: 12/13. Blocked (Cloudflare): 1/13 (flinders.nl) → tỷ lệ chặn ~8% mẫu này.
- affiliate (high): 4 — vecteezy, nordicnest, designbyamor, design-bestseller.
- partner/trade (medium/low): 3 — madeindesign, williamwood, ozdesign.
- none (true negative, xác nhận 2 lớp): 5 — namly, finnishdesignshop, thorvald, mohd, pazzo.
- unknown (blocked): 1 — flinders.
- Phát hiện qua platform outbound: 2 (uppromote, awin).

### Bài học rút ra cho code
1. Ưu tiên `__NEXT_DATA__` hơn scrape DOM (bền hơn nhiều).
2. Bắt buộc phân biệt blocked vs none.
3. Detector phải chạy CẢ 3 lớp rồi hợp nhất, không dừng ở lớp đầu.
4. Ghi `finalUrl` vì nhiều site redirect (đổi TLD/đổi ngôn ngữ) → ảnh hưởng path-probe.
5. Quét homepage có thể bỏ sót affiliate nằm ở footer trang ngôn ngữ khác ⇒ v1.1 cân nhắc quét thêm trang gốc (không /en/).
