# 11 — Tech Stack (Approved)

> Chốt bởi user trong phase bootstrap. Bổ sung cho `08-implementation-guide.md` (vốn để ngỏ tooling).

## Quyết định
| Hạng mục | Chọn | Lý do |
|---|---|---|
| Framework build MV3 | **WXT** | Auto-generate manifest, HMR dev (`wxt dev`), zip release (`wxt build`/`zip`), quy ước entrypoints rõ ràng. Giảm boilerplate MV3. |
| Ngôn ngữ | **TypeScript** | Type-safety cho classifier deterministic + schema (`ScanResult`, `Company`, `Verdict`); phục vụ NFR-05 (bảo trì). |
| Popup UI | **Vanilla TS + CSS** | UI đơn giản (form + bảng realtime + export). KISS, bundle nhỏ, không React. |
| Storage | **IndexedDB qua `idb`** + `chrome.storage.local` | Theo `04-architecture-design.md` mục 6: queue bền để resume, config nhỏ ở storage.local. |
| Test | **Vitest** (unit classify) + fixtures từ `data/test-results.json` (golden set) | Đủ cho verdict logic; e2e extension thủ công theo `07-test-plan.md`. |
| Package manager | **npm** | Mặc định, không cần thêm tooling. |
| Node | **18+** | Yêu cầu WXT. |

## Cấu trúc dự án (WXT convention)
```
affiliate-partner-finder/
  wxt.config.ts              # manifest (permissions, host_permissions) + build
  package.json
  tsconfig.json
  entrypoints/
    background.ts            # orchestrator: collect, resolve, queue, throttle, scan điều phối
    popup/
      index.html
      main.ts                # form, bảng realtime, export CSV/JSON, open evidence
      style.css
    content.ts               # (nếu cần) — detector inject qua chrome.scripting.executeScript
  lib/
    config.ts                # keywords (strong/weak), platforms, paths — từ doc 05
    detector.ts              # runDetector (link-scan + bot-block heuristic)
    path-probe.ts            # junk baseline + path probe same-origin
    classify.ts              # classify() deterministic — doc 05/06
    collect.ts               # fetch Trustpilot /search + parse __NEXT_DATA__
    resolve.ts               # /review/{domain} → websiteUrl (fallback domain)
    storage.ts               # idb wrapper: companies, results, config, progress
    export.ts                # toCSV / toJSON
    types.ts                 # Company, ScanResult, Evidence, Verdict, Confidence
  test/
    classify.test.ts         # unit — bảng quyết định doc 05 mục 6
    detector.test.ts         # jsdom link-scan
  docs/                      # tài liệu hiện có (nguồn sự thật)
```

## Ràng buộc giữ nguyên từ docs
- `host_permissions`: `*://*.trustpilot.com/*` + `<all_urls>` (doc 04/09).
- `permissions`: `tabs`, `scripting`, `storage`, `alarms`.
- Detector inject bằng `chrome.scripting.executeScript` (CORS buộc chạy same-origin — doc 03 B1).
- Anti-hallucination + ethics guardrails: giữ nguyên (doc 05, 08 Bước 6).
