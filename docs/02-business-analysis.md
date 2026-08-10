# 02 — Business Analysis (BA Kỹ thuật)

## 1. Luồng nghiệp vụ tổng quát
```
[User cấu hình query + limit]
        │
        ▼
[Collect] Trustpilot search (parse __NEXT_DATA__, phân trang)
        │  → list {name, domain, trustScore, reviews}
        ▼
[Resolve] domain → websiteUrl
   - Ưu tiên: parse review page __NEXT_DATA__ .businessUnit.websiteUrl
   - Fallback: dùng chính 'domain' (identifyingName) như website
        ▼
[Scan] mở website đích trong tab (hoặc fetch qua host_permissions)
   - Chờ load / phát hiện bot-block
   - Detector 3 lớp → evidence
        ▼
[Report] gom kết quả + trạng thái + evidence → UI + export
```

## 2. Yêu cầu chức năng (FR)
- **FR-01 Collect**: Nhập query, số trang/limit; lấy danh sách công ty từ Trustpilot qua `__NEXT_DATA__`. Hỗ trợ phân trang (`&page=N`).
- **FR-02 Resolve**: Lấy websiteUrl sạch từ trang review; fallback về domain.
- **FR-03 Scan-link**: Quét tất cả `<a>` theo bộ keyword đa ngôn ngữ (EN/DE/FR/IT/NL/SE/DK...).
- **FR-04 Scan-platform**: Phát hiện outbound link tới nền tảng affiliate đã biết (Awin, UpPromote, Refersion, ShareASale, Impact, Tradedoubler...).
- **FR-05 Scan-path**: Probe danh sách path phổ biến; so với junk-baseline để tránh soft-404.
- **FR-06 Classify**: Gán trạng thái confirmed/weak/none/blocked + confidence.
- **FR-07 Evidence**: Lưu URL, HTTP status, anchor text, method cho mỗi hit.
- **FR-08 Report/Export**: Bảng trong popup; export CSV & JSON.
- **FR-09 Re-verify**: Click mở URL bằng chứng trong tab mới.
- **FR-10 Resume/Throttle**: Hàng đợi có throttle, tạm dừng/tiếp tục, lưu tiến độ.

## 3. Yêu cầu phi chức năng (NFR)
- **NFR-01 Đạo đức/pháp lý**: Tôn trọng robots.txt & bot-detection; không bypass. Delay giữa các request (khuyến nghị 1–3s), tối đa 1 tab quét tại một thời điểm.
- **NFR-02 Độ tin cậy dữ liệu**: Không suy đoán; mọi verdict phải có evidence hoặc trạng thái blocked/unknown.
- **NFR-03 Hiệu năng**: Quét ~20 công ty trong vài phút (giới hạn bởi delay & load time).
- **NFR-04 Riêng tư**: Không gửi dữ liệu ra server ngoài (v1 chạy hoàn toàn local). Không đụng vào cookie/login của user.
- **NFR-05 Khả năng bảo trì**: Bộ keyword/path/platform tách thành file config dễ mở rộng.

## 4. Rủi ro & giảm thiểu (đã kiểm chứng thật)
| Rủi ro | Bằng chứng thực tế | Giảm thiểu |
|---|---|---|
| Trustpilot bot-check | "Verifying your connection" xuất hiện | Chạy trong tab thật; chờ & retry; không bypass |
| Site đích chặn bot (Cloudflare) | flinders.nl bị chặn (1/13) | Đánh dấu `blocked`, KHÔNG coi là none |
| CORS chặn fetch cross-origin | 3/3 fetch fail từ page context | Dùng host_permissions + background, hoặc mở tab thật |
| Soft-404 (mọi path trả 200) | Đã test junk-path baseline | Luôn probe junk path trước; chỉ tin path khác baseline |
| Affiliate qua nền tảng ngoài | designbyamor→uppromote, design-bestseller→awin | Detector lớp platform-outbound |
| Affiliate ở path lồng/ngôn ngữ khác | nordicnest: /om-oss/affiliate/ | Link-scan bổ sung path-probe; đa ngôn ngữ |
| Nhầm B2B/trade là affiliate | ozdesign "trade", williamwood "trade/partner" | Phân tầng strong vs weak; verdict riêng |
| Homepage redirect đổi ngôn ngữ | mohd.it→/en/, thorvald→.co.uk | Ghi finalUrl; cân nhắc quét cả trang gốc |

## 5. Định nghĩa "Done" cho v1
Extension chạy được end-to-end trên query "design", cho ra bảng ≥20 công ty với verdict + evidence, export CSV/JSON, và tái hiện đúng các kết quả trong `data/test-results.json`.
