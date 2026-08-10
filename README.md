# Affiliate/Partner Finder (Trustpilot) — Chrome Extension v1

Rà soát công ty trên Trustpilot theo từ khoá và **phát hiện chương trình
affiliate/partner trên website của họ**, kèm **bằng chứng kiểm chứng được** —
không suy đoán. Rule-based, chạy 100% local, không cần AI (v1).

Thiết kế đầy đủ trong [`docs/`](./docs) (01–11); đây là bản build theo tài liệu đó.

## Tính năng (v1)
- **Collect** danh sách công ty từ Trustpilot (`__NEXT_DATA__`, phân trang).
- **Resolve** website URL (fallback `https://{domain}`, tuỳ chọn lấy URL chính xác từ trang review).
- **Scan** 3 lớp: link-scan đa ngôn ngữ + affiliate-platform outbound + path-probe (có junk baseline chống soft-404).
- **Classify** deterministic: `affiliate` / `partner_trade` / `none` / `unknown` — **không bao giờ coi `blocked` = `none`**.
- **Report/Export**: bảng realtime trong popup, badge màu theo verdict, export **CSV/JSON**, mở URL bằng chứng 1 click.
- **Ethics**: mỗi lúc 1 tab, delay cấu hình được (mặc định 2s), retry ≤2, không login/submit form, không bypass CAPTCHA/Cloudflare.

## Tech stack
WXT + TypeScript · popup vanilla TS/CSS · IndexedDB (`idb`) · Vitest. Chi tiết: [`docs/11-tech-stack.md`](./docs/11-tech-stack.md).

## Yêu cầu
- Node 18+ (khuyến nghị 20 — xem `.nvmrc`)
- Google Chrome / Chromium

## Cài đặt & chạy dev
```bash
npm install          # cài deps + wxt prepare
npm run dev          # HMR dev, tự mở Chrome với extension đã load
```

## Build & load unpacked (production)
```bash
npm run build        # -> .output/chrome-mv3/
```
1. Mở `chrome://extensions`, bật **Developer mode**.
2. **Load unpacked** → chọn thư mục `.output/chrome-mv3/`.
3. Ghim extension, mở popup, nhập từ khoá (vd `design`) + số công ty → **Start**.

> Khi cài sẽ có cảnh báo quyền rộng do `host_permissions: <all_urls>` — cần để mở & quét website đích bất kỳ (xem `docs/04` §5). Extension chỉ **đọc** trang, không click/submit.

## Test
```bash
npm test             # Vitest: classify (decision table + golden), detector (jsdom), path-probe (soft-404), export
npm run compile      # tsc --noEmit (strict)
```

## Kiểm chứng golden set (acceptance)
Sau khi chạy thật trên query `design` và **Export JSON** từ popup:
```bash
node test/verify-golden.mjs path/to/exported.json            # so verdict với golden set (docs/07 §2)
node test/verify-golden.mjs path/to/exported.json --check-urls  # + kiểm tra evidenceUrl reachable (<400)
```
Script in ma trận verdict + đánh giá 4 tiêu chí pass (docs/07 §5): 4/4 affiliate-high, 0 `blocked→none`, 0 false-affiliate trên 5 ca `none`, mọi `affiliate` có `evidenceUrl`.

## Cấu trúc
```
entrypoints/
  background.ts       orchestrator: collect/resolve/scan queue/storage/alarms
  popup/              index.html · main.ts · style.css
lib/
  types.ts config.ts  schema + keyword/platform/path config
  detector.ts path-probe.ts classify.ts   detector 3 lớp (deterministic)
  collect.ts resolve.ts next-data.ts       Trustpilot __NEXT_DATA__
  scan.ts storage.ts export.ts messages.ts
test/                 Vitest specs + fixtures/golden.ts + verify-golden.mjs
docs/                 tài liệu thiết kế (nguồn sự thật)
```

## Giới hạn đã biết (v1)
- `mohd.it` redirect `/en/` có thể bỏ sót affiliate tiếng bản địa → `none/medium` (chấp nhận, v1.1 quét thêm trang gốc).
- Site chặn bot (Cloudflare) → `unknown/blocked`, **không** kết luận `none` (user tự kiểm tra thủ công).
- Trustpilot có bot-check gián đoạn → collect retry nhẹ, không bypass; nếu vẫn chặn sẽ báo lỗi.
- Phân biệt affiliate thật vs B2B/trade sâu hơn: để v2 (AI, `docs/10`).

## Pháp lý & đạo đức
Tôn trọng `robots.txt`/bot-detection, throttle, chỉ đọc dữ liệu công khai. Người dùng tự chịu trách nhiệm tuân thủ ToS của Trustpilot & site đích. Xem `docs/README.md`.
