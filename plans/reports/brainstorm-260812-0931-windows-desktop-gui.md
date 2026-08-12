---
title: "Brainstorm — Windows desktop GUI for Affiliate/Partner Finder"
date: 2026-08-12
time: "09:31"
status: accepted-recommendation
repo: affiliate-partner-finder
scope: product-design / Windows-first desktop shell
related:
  - docs/01-product-overview.md
  - lib/export.ts (toSimpleCSV / simpleHit)
  - cli/index.ts (batch engine, progress.json, resume)
  - plans/reports/advise-260810-2340-product-upgrade.md
  - entrypoints/options/ (dashboard UX reference)
note: design-full-10k Linux ops job must continue uninterrupted; this brief does not change engine runtime.
---

# Brainstorm brief — Windows desktop GUI

## Intent (translated)

CLI phù hợp developer, không thân thiện end-user. Khách cần sản phẩm cài trên máy mình (Windows trước), thấy rõ đang xảy ra gì trên màn hình, dùng được không cần terminal. Research + chọn hướng kỹ thuật; giữ engine batch CLI cho ops Linux.

---

## 1. Brainstorm contract

### Outcome

Khách hàng Windows cài một ứng dụng desktop (installer hoặc portable folder), mở một cửa sổ GUI tiếng Việt, nhập từ khoá Trustpilot + số công ty, bấm **Bắt đầu**, theo dõi tiến độ realtime trong lúc quét dài, xử lý Cloudflare khi được nhắc, tạm dừng/tiếp tục, rồi nhận file CSV human-in-the-loop:

`ten_cong_ty,website,ket_qua,huong_dan` với `ket_qua ∈ {true,false,unknown}`.

Không cần mở terminal, không cần biết Playwright/Node.

### Constraints

| Area | Constraint (evidence-backed) |
|------|------------------------------|
| Domain | Trustpilot collect → resolve website → rule-based affiliate/partner scan; local only; no CAPTCHA bypass |
| Deliverable | Simple HITL CSV via `toSimpleCSV` / `simpleHit` — `true` = any signal; `false` = page ok + empty; `unknown` = non-ok load (never false) |
| Ethics | concurrency ≤3, delay, no form submit; CF → human once in persistent Chrome profile |
| Engine reuse | Existing Playwright CLI (`cli/`, `npm run scan`) is the batch brain; Linux CLI + virtual-display ops continue |
| Windows-first | New product surface; packaging/install UX optimized for Windows 10/11 |
| Shared core | Detector/classify/export stay in `lib/` (DRY with extension + CLI) |
| Ops continuity | Do not replace or halt Linux overnight jobs (e.g. `out/design-full-10k`) |
| Accuracy floor | Prior advise: do not treat blocked/timeout as false; do not scale extension as bulk engine |

### Non-goals

- Rewriting the scan engine in another language (Go/Rust native crawler)
- Replacing Linux CLI / Xvfb ops path in v1 desktop
- Shipping AI/DeepSeek as truth layer in the first desktop release
- Chrome Web Store “batch desktop” via extension alone for 1k–10k jobs
- Cloudflare/CAPTCHA automation or bypass
- Multi-user SaaS / hosted cloud scanner
- macOS/Linux GUI parity in the first ship (can share codebase later)
- Full redesign of extension popup/dashboard (keep for interactive small jobs)

### Acceptance criteria

1. **Install:** Non-developer on a clean Windows machine installs (or unpacks) and launches the app without running `npm`/`npx` manually.
2. **First run:** UI collects query + limit (+ optional out folder); Start launches a scan that reuses the CLI engine (same semantics as `npm run scan`).
3. **Visibility:** During a long scan the user can see at least: progress (`completed/total`), current domain(s), counts of `true` / `false` / `unknown`, path to output folder, and a clear CF-help state when collect/scan needs human.
4. **Control:** Pause/stop + Resume from the same job directory (maps to existing `--resume` + `companies.json` / `results.jsonl` / `progress.json`).
5. **Export:** Primary button opens/reveals `results.csv` in simple column shape; optional advanced export may keep `results.full.csv` / `results.json` for audit.
6. **Semantics:** Zero regressions on `simpleHit` — non-ok never becomes `false` (covered by existing unit/golden path).
7. **Ethics clamps:** UI cannot set concurrency >3; defaults delay ≥1000ms.
8. **Ops isolation:** Desktop packaging work does not require stopping or redesigning the Linux CLI batch job in flight.

---

## 2. Evidence inspected (smallest relevant)

| Source | What it confirms |
|--------|------------------|
| `README.md` | Dual surface: extension (interactive) + Playwright CLI (batch, resume, scan-profile, virtual-display Linux) |
| `lib/export.ts` | End-user CSV columns + `simpleHit`/`simpleHint` contract |
| `cli/index.ts` | Args, `progress.json` (`total`,`completed`,`updatedAt`), JSONL checkpoint, export at end |
| `entrypoints/options/` | Existing Vietnamese dashboard: query/limit/delay, pause/resume, live table, export — **UX reference**, not batch engine |
| `docs/01-product-overview.md` | Personas = Affiliate Manager / BD / Researcher; HITL + evidence |
| `advise-260810-2340-product-upgrade.md` | Avoid scaling extension as bulk engine; keep accuracy floor |
| `package.json` | Stack = WXT + TS + Playwright CLI via `tsx`; no desktop shell yet |

**Assumption challenged:** “Customer needs a native-feeling desktop app” ≠ “rewrite the product.” The real gap is **install + visibility + control** over an engine that already works. Building a second scanner would violate YAGNI/DRY and risk semantic drift on `ket_qua`.

---

## 3. Customer JTBD (what they need to SEE)

### Jobs-to-be-done (Vietnamese, customer language)

1. **Tôi muốn tìm merchant có affiliate/partner theo ngành** — nhập từ khoá (vd. `design`), chọn số lượng, bấm bắt đầu.
2. **Tôi muốn biết máy đang làm gì** khi quét chạy hàng giờ — không phải nhìn terminal đen.
3. **Tôi muốn tạm dừng / tiếp tục** khi phải họp hoặc khi Chrome hiện Cloudflare.
4. **Tôi muốn biết khi nào cần tôi** (vượt challenge Trustpilot/site) và làm gì tiếp.
5. **Tôi muốn file CSV đơn giản** để lọc `true` → mở website → xác nhận tay; `unknown` = tự kiểm; không bị lừa bởi `false` giả.

### On-screen during a long scan (minimum viable telemetry)

| UI element | Source of truth (reuse) |
|------------|-------------------------|
| Thanh tiến độ `completed / total` | `progress.json` |
| Site đang quét (domain → website) | CLI log line / optional “current” field (may need thin IPC enrichment) |
| Bộ đếm `true` / `false` / `unknown` | Tail `results.jsonl` + `simpleHit` |
| Trạng thái: Thu thập / Đang quét / Chờ người (CF) / Tạm dừng / Xong / Lỗi | Process state + heuristics on log / disconnect |
| Đường dẫn thư mục job + nút “Mở thư mục” / “Mở CSV” | `--out` dir; `results.csv` |
| Nút Tạm dừng / Tiếp tục / Dừng an toàn | Kill graceful + `--resume` |
| Panel trợ giúp CF | Copy of CLI ethics text: mở Chrome profile, vượt 1 lần, bấm Tiếp tục |

**Second-order:** Without CF help + pause/resume, Windows GUI still fails overnight Trustpilot collect the same way CLI did before persistent profile — visibility alone is not enough.

---

## 4. Approaches compared (≤3 viable)

### A — Electron (or similar) shell wrapping the existing CLI engine *(recommended)*

**Shape:** Packaged Windows app. Renderer = simple Vietnamese UI (inspired by options dashboard, but columns = `ket_qua` HITL). Main process spawns bundled Node + `cli/index.ts` (or compiled entry) with mapped flags; watches `progress.json` + `results.jsonl`.

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium — packaging Playwright/Chrome/channel is the hard part, not the UI |
| Cost | Higher installer size (Chromium UI + browser deps); predictable for Node shops |
| Latency / DX | Fast to iterate UI; engine stays TS |
| Maintainability | One engine; GUI is thin adapter — DRY |
| Customer fit | Double-click `.exe` / Start Menu; window they understand |

**Second-order:** Must solve Windows Chrome channel / Playwright browser install in first-run wizard; persistent profile path under `%LOCALAPPDATA%`.

### B — Local Node HTTP server + system browser UI *(smallest interim / prototype)*

**Shape:** `AffiliateFinder.exe` (or `.bat` → packaged node) starts localhost server, opens default browser to `http://127.0.0.1:…`. Same spawn+watch pattern as A.

| Dimension | Assessment |
|-----------|------------|
| Complexity | **Lowest** code path to validate JTBD |
| Cost | Smaller than Electron if no second Chromium for UI |
| Latency / DX | Very fast prototype |
| Maintainability | Same engine reuse |
| Customer fit | Weaker “app” feel; firewall/browser prompts; easy to close wrong window |

**Second-order:** Often becomes Electron later for tray, single-instance, and “real window.” Acceptable spike, risky as final SKU.

### C — Tauri / Wails desktop shell

**Shape:** Rust (Tauri) or Go (Wails) host + webview UI; still must shell out to Node/Playwright or reimplement.

| Dimension | Assessment |
|-----------|------------|
| Complexity | High for this repo — foreign toolchain + still bundling Node engine |
| Cost | Smaller UI binary, **not** smaller total product (Playwright dominates) |
| Maintainability | Two runtimes to support; little win while engine is TS |
| Customer fit | Fine window chrome, poor fit to current stack |

**Rejected as v1:** Violates KISS given Playwright dependency mass.

### Explicitly not viable for this outcome

- **Extension-only “desktop”:** Documented anti-pattern for bulk; tab must stay open; not an installable Windows product for overnight 1k–10k.
- **Pure rewrite in Wails without CLI:** Weeks of risk for zero customer CSV improvement.

---

## 5. Recommendation (smallest that satisfies contract)

**Ship Approach A: Electron thin shell over the existing Playwright CLI**, with UI semantics aligned to simple CSV HITL (not the technical `verdict` table as primary).

**Phased to stay YAGNI:**

1. **Spike (1–3 days):** Approach B localhost dashboard that spawns CLI + tails `progress.json`/`results.jsonl` — prove JTBD screens on Windows VM.
2. **Productize:** Wrap same UI in Electron; first-run: ensure Chrome/Playwright browsers; set profile dir; Start/Resume/Export.
3. **Keep:** Linux CLI + `--virtual-display` for ops; extension for small interactive jobs.

### Rationale

- Customer outcome is **install + understand + control**, not a new detector.
- Engine already has resume, ethics clamps, simple CSV, profile/CF path — GUI should **expose** these, not reimplement.
- Electron matches the Node/TS stack; Tauri/Wails add languages without shrinking the Playwright elephant.
- Extension dashboard is a **UX crib sheet** (Vietnamese labels, pause/resume, live table) but wrong runtime for batch Windows product.

### Risks

| Risk | Mitigation |
|------|------------|
| Playwright + Chrome install friction on Windows | First-run checklist; prefer `channel: 'chrome'` if system Chrome exists; clear error copy |
| CF / headed windows confuse non-technical users | Dedicated “Cần bạn xác nhận” panel; don’t hide Chrome; link “Mở lại hồ sơ” |
| Electron + Chromium disk size | Accept for v1; document portable vs installer; don’t chase Tauri prematurely |
| Dual-UI drift (extension vs desktop) | Shared `lib/export` + shared copy strings; desktop primary columns = simple HITL |
| Packaging breaks Linux ops habits | Never couple desktop release to stopping CLI; separate npm scripts / packages if needed |
| Progress UX too thin (`progress.json` lacks “current domain”) | Minimal CLI enrichment later OR parse stdout — do not big-bang orchestrator rewrite |

---

## 6. High-level screens / flows (text wireframe)

```
┌─────────────────────────────────────────────────────────────┐
│  Trình dò Affiliate/Partner                         [_][□][x]│
├─────────────────────────────────────────────────────────────┤
│  Từ khoá [ design________ ]  Số công ty [ 200 ]             │
│  Thư mục lưu [ D:\Scans\design-200 ] [Chọn…]                │
│  [Bắt đầu]  [Tiếp tục việc trước]  [Tạm dừng]  [Dừng]       │
├─────────────────────────────────────────────────────────────┤
│  Trạng thái: Đang quét · 128 / 200                          │
│  ████████████░░░░░░░░  64%                                   │
│  Đang xử lý: nordicnest.se → https://www.nordicnest.se      │
│  Kết quả: true 12 · false 90 · unknown 26                   │
│  CSV: D:\Scans\design-200\results.csv   [Mở thư mục] [Mở CSV]│
├─────────────────────────────────────────────────────────────┤
│  ⚠ Cần bạn (khi hiện): Cloudflare / xác minh trình duyệt    │
│  1. Cửa sổ Chrome đã mở — hoàn thành kiểm tra một lần       │
│  2. Quay lại đây → bấm Tiếp tục                             │
│  (Không tự vượt CAPTCHA.)                                   │
├─────────────────────────────────────────────────────────────┤
│  Bảng gần đây (ket_qua)                                     │
│  ten_cong_ty     website              ket_qua   huong_dan   │
│  Nordic Nest     https://…            true      Có dấu hiệu…│
│  Example Co      https://…            unknown   Không mở…   │
│  …                                                           │
│  [Lọc: Tất cả ▾]  [Chỉ true]                                │
└─────────────────────────────────────────────────────────────┘
```

**Flow**

1. Cài đặt → mở app → (lần đầu) kiểm tra Chrome/Playwright.
2. Nhập query/limit/out → Bắt đầu → thu thập Trustpilot → quét site.
3. Nếu CF → banner chờ người → Resume.
4. Xong → nhấn mạnh CSV đơn giản; optional “file kỹ thuật”.
5. Việc sau: Tiếp tục việc trước (cùng thư mục) = `--resume`.

---

## 7. Implementation considerations (advise only — no code)

- **Adapter boundary:** GUI ↔ `spawn(cli, args)` + filesystem watch; avoid importing Playwright into renderer.
- **Defaults for customers:** concurrency 2, delay 1500, scan-profile ON on Windows (headed), virtual-display N/A.
- **i18n:** Vietnamese primary in GUI; keep CLI English logs for ops.
- **CSV v2 (from prior advise):** `url_goi_y` + sort true→unknown→false — nice follow-on, not blocking first window.
- **Success metrics:** time-to-first-CSV on clean Win11 VM < 30 min including install; zero non-ok→false in exported simple CSV; user can explain on-screen status without reading README.

---

## 8. Decision summary

| Field | Decision |
|-------|----------|
| Outcome | Windows-installable GUI product for HITL simple CSV scans |
| Approach | Electron thin shell wrapping existing CLI (spike via local web UI OK) |
| Reuse | `cli/` + `lib/` + simple CSV contract |
| Keep separate | Linux CLI ops; Chrome extension for small interactive jobs |
| Simplest viable | Localhost UI spike → Electron package; not Tauri/Wails/rewrite |

---

## 9. Unresolved questions

1. **Distribution:** Customer nhận `.exe` installer, portable zip, hay cài qua IT nội bộ? (đổi signing / SmartScreen)
2. **Chrome dependency:** Bắt buộc Google Chrome đã cài, hay bundle Chromium Playwright only?
3. **Batch size expectation on Windows:** “vài trăm” vs “hàng nghìn overnight” — ảnh hưởng CF UX và liệu có cần tray + “chạy nền”?
4. **Pause semantics:** Soft pause (finish current domain) vs kill process ngay — khách prefer cách nào?
5. **Multi-job:** Một thư mục/job như CLI, hay UI quản lý nhiều job song song? (khuyến nghị v1: một job active)
6. **Licensing / branding:** Tên sản phẩm end-user khác repo kỹ thuật?
7. **Who pays for first Windows packaging spike** — same week as design-full-10k ops, or after golden floor freeze?

---

## Next step

Nếu đồng ý contract + recommendation: chạy planning (`/ak:plan`) cho spike Windows GUI adapter (spawn CLI + progress UI), rồi mới Electron package. **Không** implement trong brainstorm này; **không** đụng `design-full-10k`.
