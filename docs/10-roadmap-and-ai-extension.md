# 10 — Roadmap & Khi nào cần AI

## v1 (Rule-based, KHÔNG cần AI) — đủ cho pipeline hiện tại
- Collect + Resolve + Detector 3 lớp + Export. Đã chứng minh khả thi bằng test thật.

## v1.1 — Tăng độ phủ
- Quét thêm footer trang gốc (không auto `/en/`) để bắt affiliate theo ngôn ngữ bản địa (ca mohd.it).
- Mở rộng path list & platform list theo dữ liệu thu thập.
- Retry thông minh cho site `blocked` (thử lại sau, hoặc mở active tab để user tự pass challenge 1 lần).

## v2 — Tích hợp AI (chỉ khi cần)
AI KHÔNG cần cho phần "có/không link". AI hữu ích cho:
1. **Phân loại ngữ nghĩa**: phân biệt "affiliate program" thật vs "B2B/wholesale/trade/dealer" (ca ozdesign, williamwood, madeindesign). Đưa text trang + anchor vào LLM → nhãn + lý do.
2. **Trích điều khoản**: hoa hồng %, cookie duration, nền tảng, điều kiện tham gia.
3. **Chấm điểm cơ hội**: kết hợp trustScore + số review + loại chương trình → xếp hạng lead.
4. **Chuẩn hoá đa ngôn ngữ**: tự nhận diện từ khoá mới ở ngôn ngữ lạ mà rule chưa có.

### Nguyên tắc dùng AI (giữ chống ảo giác)
- AI chỉ chạy TRÊN evidence đã thu thập thật (text/anchor/URL), không tự "đoán" ngoài dữ liệu.
- Luôn kèm evidence gốc bên cạnh nhãn AI để người dùng đối chiếu.
- Đánh dấu rõ trường nào do AI suy luận vs quan sát trực tiếp.

## v3 — Mở rộng nguồn & phân tích
- Nguồn khác ngoài Trustpilot (category pages, danh bạ ngành).
- Dashboard phân tích: tỷ lệ affiliate theo ngành/quốc gia, nền tảng phổ biến.
- Export sang CRM (HubSpot/Sheet) + lịch quét định kỳ.
