# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: Vietnamese-speaking affiliate managers and BD/partnership people who are not developers. They sit at a Windows (or Linux) desk, open the desktop window, start or resume a scan by Trustpilot keyword, watch progress, then open the CSV to confirm hits by hand.

Secondary: the same product’s operator — the person who launches large jobs (hundreds to 10k companies), leaves the machine running, and returns only for Cloudflare/browser checks, errors, or completion.

Design target is the customer window. Operator needs must remain readable: live progress, ETA, error cause, resume, and Cloudflare instructions.

## Product Purpose

Affiliate Partner Finder (desktop title: **Trình dò Affiliate/Partner**) finds companies on Trustpilot by keyword, opens each company’s website locally, and classifies whether a public affiliate or partner program is in evidence.

Success is a local CSV the human can trust: `true` only with evidence of a program, `false` only when the site loaded and no sign was found, `unknown` when the site could not be opened. Blocked is never recorded as none.

## Positioning

The mechanism a neighboring scraper or AI summarizer cannot copy: **rule-based, fully local detection with verifiable evidence, and a hard refusal to treat blocked/timeout as “no program.”** Classification is deterministic (`affiliate` / `partner_trade` / `none` / `unknown` internally; end-user CSV uses `true` / `false` / `unknown`). The desktop is a window over that local job, not a cloud service.

## Operating Context

- Electron desktop wrapping the existing Playwright CLI. Data and Chrome profile stay on the machine under app-owned roots.
- Jobs are folders (progress, companies, results, CSV). Resume is the same folder.
- Typical session: pick or create a job → set keyword + company count → optional **Lấy danh sách** first pass (Trustpilot list only, no site scan) or **Bắt đầu** / Resume for Full collect-then-scan → watch collect then website scan → handle one Cloudflare check in the app’s Chrome if asked → Stop safely or let it finish → Open CSV.
- Overnight/large jobs: Chrome may be hidden (Windows: minimize/off-screen but still headed; Linux: Xvfb). If Trustpilot blocks while hidden, the user turns hiding off, resumes, passes the check once, then may hide again.
- After export, review happens in the CSV / spreadsheet, not inside a results table in this app (this rebuild does not add in-app company browsing).
- Extension popup exists separately; this work is the desktop window only.

## Capabilities and Constraints

Confirmed in the desktop window today and **must remain**:

- Trustpilot keyword + company limit 1–10000 (type `10000`, not `10.000`).
- Job folder: pick folder, new job, choose existing run, open runs root in the file manager.
- Scan options (defaults: concurrency 2 unless “Tăng tốc” → 3; early-exit / network evidence / lazy settle off; hide Chrome on).
- Start (Full collect then scan), Resume, Stop (SIGINT + CSV from results so far).
- **Lấy danh sách**: local list-only first pass, no site scan. Full Start/Resume remain.
- Live dashboard: state (idle / running / stopping / error), job keyword, collect vs scan phase, percent, fraction, hint, rolling ETA (hide when stalled >8 minutes), counts true/false/unknown, current domains, status message.
- Cloudflare panel: complete the check in the app Chrome; do not bypass CAPTCHA.
- Open job folder and Open CSV (`results.csv` if present: columns `ten_cong_ty,website,ket_qua,huong_dan`; else `companies.csv`: `stt,ten_website,link`).
- Vietnamese UI. Copy may be tightened; facts and ethics must not change.

This rebuild’s product job: the window is a **job workspace** — existing jobs are the home surface; the selected job is the work surface (configure, run, watch). Not a stacked form. Not an in-app results browser.

Must not: rewrite the scan engine; send data to a server; log into target sites; submit forms; bypass CAPTCHA/Cloudflare; point the profile at personal Chrome User Data; start fresh into a folder that already has `companies.json`.

Undecided: English localization; code-signing; in-app results table (explicitly out of this rebuild).

## Brand Commitments

- Product name: Affiliate Partner Finder. Window title and heading stay **Trình dò Affiliate/Partner** (tests and customer docs use this).
- Voice: plain Vietnamese for a non-developer. Technical flags are explained in ordinary language.
- The desktop must feel like a finished application workspace, not a utility form dropped in a window.
- Incumbent cream/panel/red-accent look is **not** a brand commitment; it is the visual to replace.
- Visual world (user-chosen canon, 2026-08-26): play the category-standard desktop workspace **straight**, at the craft of **Linear** (sidebar + view chrome, hairline surfaces, dense-but-quiet hierarchy) and **Windows 11 Explorer** (job = folder in a navigation pane, command bar, details pane, status bar, Segoe UI / system stack). No smuggled metaphor, no cream stationery, no terminal chrome.

## Evidence on Hand

- Desktop renderer: `desktop/renderer/index.html`, `app.js`, `styles.css`.
- Customer docs: `docs/desktop-windows.md`, `docs/01-product-overview.md`.
- E2E: `test/desktop-electron.e2e.test.ts` (Vietnamese shell, `#btnStart`, `#btnPickOut`, heading contains `Trình dò Affiliate`).
- No customer testimonials, logos, or marketing photography. Do not invent customers, hit rates, or pricing.
- Demonstration jobs in the UI may use synthetic run names/progress labeled as such if shown as examples; live data comes from the user’s own job folders.

## Product Principles

1. Evidence over guesswork — a verdict without a reachable site is `unknown`, never `false`.
2. Local and interruptible — jobs live in folders, stop cleanly, resume from the same place.
3. The customer can run it without a terminal; the operator can still read a long job at a glance.
4. Ethics bound the product: no CAPTCHA bypass, no login, no touching the user’s personal Chrome profile.
5. The window is a workspace of jobs, not a one-shot form.

## Accessibility & Inclusion

No separate legal standard was set. The window must remain keyboard-operable, keep visible focus, live-update progress with `aria-live` / progressbar semantics, and stay readable at the current minimum window size (880×640). Vietnamese is the only supported language.
