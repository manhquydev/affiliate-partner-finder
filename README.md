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
npm test             # Vitest unit tests (detector/classify/export/golden)
```

## Desktop GUI (Windows-first)

Ứng dụng cửa sổ cho khách hàng (không cần terminal). Bọc CLI, theo dõi tiến độ + **ETA**, CSV HITL.

```bash
npm install
npm run desktop:dev
```

**v1.0.4:** bảng tiến độ có ETA lăn; tùy chọn quét (mặc định **tắt**): early-exit, `--network-evidence`, `--lazy-settle` — chỉ bật khi đo A/B / cần thêm tín hiệu trang `ok`, **không** dùng để “giảm unknown”.

Hướng dẫn khách / đóng gói / tải bản phát hành: [`docs/desktop-windows.md`](./docs/desktop-windows.md).  
Releases: https://github.com/manhquydev/affiliate-partner-finder/releases

Adapter + test: `desktop/`, `test/desktop-adapter.test.ts`.

## Local CLI (batch)

Batch scanner cho quét theo ngành trên máy local (Playwright), dùng chung detector/classify với extension. Output CSV/JSON + resume.

```bash
npx playwright install chromium   # lần đầu
npm run scan -- --query design --limit 10 --out ./out/run1
# resume sau khi dừng giữa chừng:
npm run scan -- --resume --out ./out/run1
```

- Collect Trustpilot: Chrome persistent profile mặc định `~/.cache/affiliate-partner-finder/chrome-profile` (headed). Nếu Cloudflare: vượt challenge một lần trong cửa sổ đó, rồi chạy lại — **không bypass CAPTCHA**.
- Scan: concurrency mặc định 2 (max 3), `--delay-ms` start-stagger. Path-probe luôn chạy trừ khi bật `--early-exit`.
- Chống treo batch: `page`/`context` close bị giới hạn ~3s (`closeQuietly`) — site kẹt không chặn cả job.
- **Lazy settle (opt-in):** `--lazy-settle` thay fixed `waitForTimeout(1200)` bằng scroll + MutationObserver trong budget ≤1200ms (không cộng thêm). **Default OFF** — giữ throughput; bật chỉ khi đo A/B recall trên trang `ok`. Extension vẫn `sleep(700)` (parity riêng).
- **Network evidence (opt-in):** `--network-evidence` lắng nghe `request`/`response` host (allowlist platform/CDN, không `page.route`), merge `networkHits` / `method=network`. **Default OFF** — không bật trên job 10k đang chạy trừ khi đo A/B có chủ đích.
- **Golden / CF:** thêm `--scan-profile` (kéo theo headed) để site scan dùng cùng profile cookies; khuyến nghị:
  ```bash
  npm run scan -- --resume --out ./out/run1 --scan-profile --accept-failures --concurrency 2
  ```
- **Không chiếm màn hình chính:** `--virtual-display` re-exec dưới Xvfb (cần `xvfb` / `xvfb-run`). Chrome vẫn *headed* với anti-bot nhưng không hiện trên desktop `:0`:
  ```bash
  npm run scan -- --resume --out ./out/run1 --scan-profile --virtual-display --accept-failures
  # hoặc
  npm run scan:xvfb -- --resume --out ./out/run1 --scan-profile --accept-failures
  ```
  Khi gặp Cloudflare: vượt challenge một lần trên display thật (bỏ `--virtual-display` tạm) hoặc gắn VNC vào display ảo, rồi `--resume`.
- Artefacts: `companies.json`, `results.jsonl`, **`results.csv`** (end-user: `ten_cong_ty,website,ket_qua,huong_dan` với `true`/`false`/`unknown`), `results.full.csv` + `results.json` (kỹ thuật/audit).
- `ket_qua=true` = có dấu hiệu affiliate **hoặc** partner → người vào xác nhận; `false` = đã mở trang, không thấy dấu hiệu; `unknown` = không mở được (không ghi false để tránh miss).
- Kiểm tra live export kỹ thuật: `node test/verify-golden.mjs ./out/run1/results.json`

Chi tiết kế hoạch: `plans/260810-1610-local-cli-batch-scanner-accuracy-floor/`.

## Ethics & giới hạn
- 1–3 scan song song (CLI), delay cấu hình được; extension vẫn 1 tab.
- Không login/submit form; không bypass CAPTCHA/Cloudflare.
- Chỉ đọc trang / export local.

## Kiểm chứng golden set (acceptance)
Sau khi chạy thật trên query `design` và **Export JSON** (popup hoặc CLI `results.json`):
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

## Cách chạy dài & tích luỹ (v1.1)
- Vòng lặp quét chạy trong **trang bảng điều khiển** (options, mở trong tab) — không ở service worker → **chạy dài không bị đứng**, không phải bấm "Tiếp tục". **Lưu ý: giữ tab bảng điều khiển mở** khi đang quét (nền/minimize OK, đóng thì dừng — mở lại sẽ tự tiếp tục).
- Popup "Bắt đầu & mở bảng" sẽ mở dashboard và quét luôn.
- **Chống trùng + tích luỹ:** kết quả lưu bền ở IndexedDB. 3 chế độ ở dashboard:
  - **Quét công ty mới** — giữ kết quả cũ, bỏ qua domain đã quét, lấy công ty MỚI (page sâu hơn).
  - **Làm mới mục cũ** — quét lại các mục có kết quả cũ hơn "Làm mới sau (ngày)".
  - **Quét lại từ đầu** — xoá sạch và quét lại.
- **Thông báo** hệ thống khi quét xong.

## Vì sao trước đây dừng ~10 & cách quét nhiều hơn
- **Nguyên nhân:** thu thập danh sách bằng `fetch` tới Trustpilot bị **Cloudflare chặn (403)** sau trang 1 → dừng sớm. Đã đổi sang **mở một tab Trustpilot thật** để thu thập: trình duyệt dùng phiên/cookie của bạn vượt Cloudflare, đọc `__NEXT_DATA__`, rồi **tự chuyển trang** `?page=N` để lấy nhiều công ty.
- **Để quét nhiều:** đặt **Số công ty** lớn (vd 100–200), giữ **tab bảng điều khiển mở**. Bộ thu thập sẽ lật nhiều trang cho tới khi đủ số lượng hoặc hết trang. Lần chạy trước đó đã quét domain nào thì lần này **tự bỏ qua** (lấy công ty MỚI) — muốn quét lại tất cả thì bấm **Quét lại từ đầu**.
- Lưu ý: nếu Trustpilot hiện trang "verifying" liên tục, hãy **mở trustpilot.com/search một lần trong tab thường** để qua kiểm tra rồi chạy lại (không bypass).

## Cấu hình bộ dò (nâng cao)
Trong bảng điều khiển, mục **⚙ Cấu hình bộ dò**: sửa/bổ sung danh sách từ khoá `strong`/`weak`, **nền tảng affiliate** (khớp theo tên miền), và **đường dẫn probe**. Lưu vào `chrome.storage.local` (giữ qua "Quét lại từ đầu"). Để trống một ô = dùng mặc định. Áp dụng cho các lần quét sau — mở rộng đa ngôn ngữ/nền tảng không cần build lại.

## Giới hạn đã biết (v1)
- Quét chỉ tiến khi **tab dashboard còn mở** (đánh đổi để chạy dài ổn định; không bị giới hạn service worker). Đóng tab giữa chừng → mở lại tự tiếp tục các mục chưa quét.
- Tạm dừng rồi Tiếp tục ở chế độ "Làm mới mục cũ" có thể không quét lại đúng các mục đang dở (best-effort v1); chế độ "Quét công ty mới" thì tiếp tục chuẩn.
- Thông báo dùng icon tối giản (data URI); một số bản Chrome có thể bỏ qua icon — trạng thái "Hoàn tất" vẫn hiển thị ở dashboard.
- `mohd.it` redirect `/en/` có thể bỏ sót affiliate tiếng bản địa → `none/medium` (chấp nhận, v1.1 quét thêm trang gốc).
- Site chặn bot (Cloudflare) → `unknown/blocked`, **không** kết luận `none` (user tự kiểm tra thủ công).
- Trustpilot có bot-check gián đoạn → collect retry nhẹ, không bypass; nếu vẫn chặn sẽ báo lỗi.
- Phân biệt affiliate thật vs B2B/trade sâu hơn: để v2 (AI, `docs/10`).

## Pháp lý & đạo đức
Tôn trọng `robots.txt`/bot-detection, throttle, chỉ đọc dữ liệu công khai. Người dùng tự chịu trách nhiệm tuân thủ ToS của Trustpilot & site đích. Xem `docs/README.md`.
