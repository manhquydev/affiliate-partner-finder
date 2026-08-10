# 08 — Implementation Guide (cho AI agent build)

## Bước 0 — Chuẩn bị
- Node 18+, dùng `wxt` hoặc `vite + @crxjs/vite-plugin` để build MV3. Có thể vanilla JS nếu muốn tối giản.
- Cấu trúc thư mục:
```
/src
  /background   (orchestrator, collect, resolve, queue)
  /content      (detector.js)
  /popup        (UI: form, table, export)
  /lib          (config: keywords.js, paths.js, platforms.js; storage.js; classify.js)
  manifest.json
```

## Bước 1 — Collect (background)
- `GET https://www.trustpilot.com/search?query={q}&page={n}` với header `accept: text/html`.
- Regex lấy `<script id="__NEXT_DATA__">...</script>`, JSON.parse.
- Đọc `props.pageProps.businessUnits[]` → map {name=displayName, domain=identifyingName, trustScore, reviews}.
- Lặp page tới khi đủ limit hoặc `pageProps.hasMore==false`.
- Delay 1–2s giữa các page.

## Bước 2 — Resolve (background, tùy chọn)
- Nếu cần websiteUrl chính xác: `GET /review/{domain}`, parse `__NEXT_DATA__` → `businessUnit.websiteUrl`.
- Fallback rẻ: dùng `https://{domain}` trực tiếp (domain = identifyingName). Đủ dùng đa số ca.

## Bước 3 — Scan (background + content)
```js
const tab = await chrome.tabs.create({url: websiteUrl, active:false});
await waitForComplete(tab.id, 20000);       // onUpdated status complete + timeout
const [{result}] = await chrome.scripting.executeScript({
  target:{tabId:tab.id},
  func: detectorFn,        // hàm detector (xem 05 + skeleton)
  args:[CONFIG]
});
await chrome.tabs.remove(tab.id);
```
- Nếu waitForComplete timeout → loadStatus=timeout.
- Trong detector, tự set loadStatus=blocked theo heuristic (05 mục 7).

## Bước 4 — Classify & Store
- Gọi `classify()` (deterministic) → verdict/confidence.
- Ghi IndexedDB. Emit progress qua `chrome.runtime.sendMessage`.

## Bước 5 — UI & Export
- Popup: form (query, limit, delay), nút Start/Pause, bảng realtime, badge verdict màu.
- Export CSV/JSON từ IndexedDB. Nút "Open evidence" mở evidenceUrl.

## Bước 6 — Ethics guardrails (bắt buộc)
- Throttle: tối đa 1 scan tab đồng thời, delay cấu hình được (mặc định 2s).
- Không retry quá 2 lần/ site. Tôn trọng khi site trả 429.
- Không login, không submit form, không bypass CAPTCHA/Cloudflare (nếu gặp → blocked).

## Bước 7 — Verify với golden set
- Chạy trên query "design", đối chiếu `data/test-results.json`. Đạt tiêu chí ở 07-test-plan.

## Gợi ý xử lý MV3 service worker bị kill
- Lưu queue + con trỏ tiến độ vào IndexedDB sau mỗi company.
- Dùng `chrome.alarms` mỗi ~20s để "poke" tiếp tục nếu còn job.
