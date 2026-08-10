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
