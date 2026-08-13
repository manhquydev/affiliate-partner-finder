# Affiliate/Partner Program Finder — Bộ tài liệu build Extension

> Bộ tài liệu này dành cho **AI agent / lập trình viên** để build một Chrome Extension (Manifest V3) tự động rà soát các công ty trên Trustpilot và phát hiện chương trình affiliate/partner trên website của họ.

## Mục tiêu sản phẩm
Thay thế quy trình thủ công (vào Trustpilot → tìm category → mở từng "Visit website" → tự dò affiliate) bằng một công cụ tự động, **rà soát thật và xuất kết quả có bằng chứng kiểm chứng được** (không suy đoán).

## Pipeline (4 giai đoạn)
1. **Collect** — Lấy danh sách công ty từ Trustpilot (tên, domain, điểm, số review).
2. **Resolve** — Lấy website URL sạch của từng công ty.
3. **Scan** — Mở website đích, phát hiện affiliate/partner bằng 3 cơ chế bổ sung nhau.
4. **Report** — Xuất CSV/JSON kèm bằng chứng + trạng thái tin cậy.

## Vì sao chọn Extension (không phải script/CLI hay backend crawler)
Ba ràng buộc đã được **kiểm chứng thật trên trình duyệt** (xem `03-technical-findings.md`):
- Trustpilot chặn crawl server-side (`robots.txt: Disallow /search, /api/*`) + Cloudflare bot-check.
- `fetch` cross-origin từ page context **bị CORS chặn 100%** → script trong 1 tab không tự đọc site khác được.
- Nhiều site đích chặn bot; tab thật trong trình duyệt người dùng vượt qua tốt hơn crawler.

## Danh mục tài liệu
| File | Nội dung |
|---|---|
| `01-product-overview.md` | Tầm nhìn, personas, user stories, scope |
| `02-business-analysis.md` | BA kỹ thuật: yêu cầu chức năng/phi chức năng, luồng, rủi ro |
| `03-technical-findings.md` | **Kết quả kiểm thử thật** trên Trustpilot + 13 site đích |
| `04-architecture-design.md` | Kiến trúc MV3, component, data flow, storage |
| `05-detector-spec.md` | Spec chi tiết thuật toán detect + chống ảo giác |
| `06-data-schema.md` | Schema dữ liệu, định dạng export |
| `07-test-plan.md` | Kế hoạch test nhiều vòng + test case thật |
| `08-implementation-guide.md` | Hướng dẫn build từng bước cho AI agent |
| `09-manifest-and-skeleton.md` | manifest.json + code khung khởi đầu |
| `10-roadmap-and-ai-extension.md` | Roadmap giai đoạn 2 (khi nào cần AI) |
| `11-tech-stack.md` | Tech stack |
| `desktop-windows.md` | Desktop GUI (Windows/Linux): dùng app, tùy chọn Track A, tải Releases |
| `data/test-results.json` | Dữ liệu kiểm thử thô (evidence) |

## Nguyên tắc cốt lõi: chống ảo giác kết quả
Công cụ **chỉ báo cáo cái quan sát được**, mỗi kết quả kèm: URL bằng chứng, HTTP status, anchor text đã match, phương pháp phát hiện. Phân biệt rạch ròi 4 trạng thái: `confirmed`, `weak`, `none`, `blocked/unknown`. **Tuyệt đối không coi "blocked" = "không có affiliate".**

## Lưu ý pháp lý & đạo đức
- Tôn trọng `robots.txt` và bot-detection; không bypass CAPTCHA/Cloudflare.
- Throttle request, chạy tuần tự, thêm delay để không gây tải.
- Chỉ đọc dữ liệu công khai; không đăng nhập, không submit form trên site đích.
- Người dùng tự chịu trách nhiệm về cách dùng dữ liệu (tuân thủ ToS của Trustpilot).
