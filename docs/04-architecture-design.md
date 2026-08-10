# 04 — Architecture Design (Chrome Extension MV3)

## 1. Sơ đồ component
```
┌───────────────────────────────────────────────┐
│ Popup / Options UI (React or vanilla)          │
│  - form query+limit, bảng kết quả, export      │
└───────────────┬───────────────────────────────┘
                │ chrome.runtime messaging
┌───────────────▼───────────────────────────────┐
│ Background Service Worker (orchestrator)       │
│  - Job queue, throttle, state machine          │
│  - Collect: fetch Trustpilot /search (NEXT_DATA)│
│  - Resolve: fetch /review/{domain} (NEXT_DATA) │
│  - Điều phối Scan: tạo tab ẩn / offscreen      │
│  - Ghi IndexedDB, phát tiến độ ra UI           │
└───────┬───────────────────────────┬───────────┘
        │ chrome.tabs / scripting    │
        ▼                            ▼
┌────────────────────┐   ┌──────────────────────────┐
│ Content Script      │   │ Storage (IndexedDB)       │
│ (chạy trên site đích)│   │ - jobs, companies, results │
│  - detector 3 lớp   │   │ - config (kw/paths/platform)│
│  - trả evidence     │   └──────────────────────────┘
└────────────────────┘
```

## 2. Vì sao cấu trúc này (bám theo findings)
- **Background fetch cho Trustpilot**: với `host_permissions` cho `*://*.trustpilot.com/*`, background fetch `/search?page=N` lấy `__NEXT_DATA__` (đã kiểm chứng trả 200 + JSON). Không cần mở tab cho bước Collect/Resolve.
- **Content script cho site đích**: vì CORS chặn fetch cross-origin, phải chạy detector NGAY TRONG origin của site đích. Mở tab (ẩn/nền) tới website → inject content script → detector chạy same-origin (link-scan + same-origin path-probe) → trả evidence.
- **Throttle bằng queue** ở background: mỗi lúc 1 tab, delay 1–3s, tôn trọng NFR đạo đức.

## 3. Cơ chế Scan chi tiết
1. Background lấy `websiteUrl`.
2. Mở tab: `chrome.tabs.create({url, active:false})`.
3. Chờ `tabs.onUpdated status==='complete'` + timeout (vd 20s).
4. Phát hiện bot-block: nếu title/ło chứa "Just a moment", "Attention Required", "Verifying" hoặc totalLinks < 5 → đánh dấu `blocked`.
5. `chrome.scripting.executeScript` inject detector → nhận evidence.
6. Đóng tab, ghi kết quả, delay, sang công ty kế.

## 4. State machine cho mỗi company
```
queued → resolving → scanning → done(confirmed|weak|none)
                              ↘ blocked  (site chặn / timeout)
                              ↘ error    (lỗi kỹ thuật)
```

## 5. Quyền (permissions) cần
- `host_permissions`: `*://*.trustpilot.com/*` + `<all_urls>` (để mở & scan site đích bất kỳ). Cân nhắc optional_host_permissions xin theo nhu cầu.
- `tabs`, `scripting`, `storage`.
- KHÔNG cần `cookies`, `webRequest` cho v1.

## 6. Lưu trữ
- IndexedDB (qua idb) cho: `companies`, `results`, `config`. Cho phép resume khi đóng popup.
- `chrome.storage.local` cho config nhỏ + tiến độ.

## 7. Ràng buộc & lưu ý
- Service worker MV3 có thể bị kill → dùng queue bền trong IndexedDB + `chrome.alarms` để hồi phục.
- Tab ẩn không thực sự "ẩn"; dùng cửa sổ riêng minimized hoặc tab background. Tránh làm phiền user.
- Một số site chặn iframe → phải dùng tab thật, không iframe.

## 8. Cập nhật v1.1 — vòng lặp quét chạy ở trang dashboard (không ở service worker)
**Vấn đề thực tế:** chạy dài (>~10 site) bị đứng, phải bấm "Tiếp tục". Nguyên nhân: SW MV3 bị Chrome kill (idle 30s — `setTimeout` không giữ SW sống; trần 5 phút; `fetch` >30s bị kill). `chrome.alarms` resume chỉ là lưới an toàn, độ trễ cao → kiến trúc dễ vỡ.

**Thay đổi:**
- **Orchestrator (collect + hàng đợi quét) chuyển sang chạy trong TRANG DASHBOARD** (`entrypoints/options` + `lib/run-engine.ts`). Trang đang mở là extension page, **không dính giới hạn lifetime** của SW → chạy dài ổn định, bỏ `chrome.alarms`/resume thủ công. Ràng buộc: **tab dashboard phải mở** khi quét (nền/minimize OK).
- **Service worker rỗng** (`entrypoints/background.ts`) — không còn điều phối.
- **IndexedDB là nguồn sự thật chung**: popup + dashboard đọc trực tiếp. Popup chỉ là bộ khởi chạy (ghi `pendingRun` vào `chrome.storage.session` rồi mở dashboard) + xem lướt (nghe `PROGRESS`).
- **Chống trùng chéo giữa các lần chạy**: không xoá kết quả cũ khi START; bỏ qua domain đã quét (dedup) → mỗi lần collect **page sâu hơn** lấy công ty MỚI (dedup thay cho con trỏ phân trang). 3 chế độ: `new` (quét công ty mới), `refreshStale` (quét lại mục cũ > `staleDays`), `restart` (xoá & quét lại).
- **Khoá đa-tab** qua `chrome.storage.session` + guard trong-tab tránh chạy 2 vòng lặp song song.
- **Thông báo** `chrome.notifications` khi quét xong (chạy dài không cần giám sát).
- `resolve()` thêm timeout 12s cho fetch (tránh treo/kill).
