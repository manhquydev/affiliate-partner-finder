# 01 — Product Overview

## 1. Vấn đề
Team marketing/affiliate cần tìm các doanh nghiệp (theo ngành, ví dụ "design") có **chương trình tiếp thị liên kết (affiliate)** hoặc **partner program** để hợp tác. Hiện làm thủ công: vào Trustpilot, tìm category, mở từng website qua nút "Visit website", rồi tự dò footer/menu xem có affiliate không. Chậm, dễ sót, không nhất quán.

## 2. Giải pháp
Chrome Extension chạy trong trình duyệt người dùng, tự động:
- Lấy danh sách công ty theo từ khoá/category trên Trustpilot.
- Resolve website chính thức của từng công ty.
- Mở & rà soát từng website tìm dấu hiệu affiliate/partner.
- Xuất bảng kết quả có **bằng chứng** và **mức độ tin cậy**.

## 3. Personas
- **Affiliate Manager**: tìm nhanh danh sách merchant có affiliate program để liên hệ.
- **BD/Partnership**: tìm doanh nghiệp có partner/reseller/B2B program.
- **Researcher**: khảo sát tỷ lệ áp dụng affiliate trong một ngành.

## 4. User Stories
- US-01: Là user, tôi nhập từ khoá (vd "design") và số lượng công ty cần quét, để hệ thống tự thu thập danh sách từ Trustpilot.
- US-02: Là user, tôi muốn hệ thống tự mở từng website và cho biết công ty nào **có** affiliate program, kèm link bằng chứng.
- US-03: Là user, tôi muốn phân biệt "affiliate thật" với "partner/B2B/trade" để ưu tiên đúng.
- US-04: Là user, tôi muốn biết site nào **không truy cập được** (bị chặn) để tự kiểm tra thủ công, thay vì bị báo nhầm "không có".
- US-05: Là user, tôi muốn export CSV/JSON để đưa vào CRM/Sheet.
- US-06: Là user, tôi muốn mở lại đúng URL bằng chứng bằng 1 click để tự xác minh.

## 5. Phạm vi (Scope)
### In-scope (v1 - Rule-based, không AI)
- Nguồn: Trustpilot search theo query.
- Detect: link-scan đa ngôn ngữ + affiliate-platform outbound + path-probe (có junk baseline).
- Output: bảng trong popup + export CSV/JSON với evidence.
- Trạng thái: confirmed / weak / none / blocked.

### Out-of-scope (v1)
- Đăng nhập vào site đích, submit form.
- Bypass CAPTCHA/Cloudflare.
- Phân loại ngữ nghĩa sâu (affiliate vs B2B) bằng AI — để v2.
- Crawl toàn bộ site (chỉ homepage + probe path phổ biến + trang được link).

## 6. Tiêu chí thành công
- Với site load được, phát hiện đúng affiliate rõ ràng ≥ 90% (đo trên tập kiểm thử thật, xem test-plan).
- 0 false-positive kiểu "coi blocked = none".
- Mỗi kết quả `confirmed` đều mở được URL bằng chứng thật.
