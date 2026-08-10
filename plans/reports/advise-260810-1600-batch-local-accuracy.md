# Advise — Affiliate Partner Finder: batch local, accuracy floor

Date: 2026-08-10  
Input: scout + interview (`--advise`)  
Status: reframing confirmed by user

## Reframing (confirmed)

**Problem:** Need industry/category-scale Trustpilot→site scans for affiliate/partner with verifiable evidence. Current Chrome MV3 extension is serial (1 tab, dashboard-orchestrated, ~30 path probes/company) and will congest on batch. Accuracy is hard floor; speed must make industry batches feasible on a local machine.

**Exact requirements:**
1. Never map blocked → none; confirmed results have openable evidence URLs.
2. Clear-affiliate recall ≥ ~90% on golden set (existing product criterion); no precision collapse when speeding up.
3. Run local; no cloud dependency this phase.
4. Primary output = CSV/JSON (or equivalent) with evidence.
5. Industry-batch throughput clearly better than current serial scan, without violating (1)–(2).

**Goals:** Trustworthy local batch pipeline for research/outreach. Tool form (CLI vs extension) is a means.

**Non-goals:** Multi-tenant SaaS, cloud browser fleet, CAPTCHA bypass, full-site crawl, daily drip UX.

**Constraints:** Local-first; keep ethical throttle (don’t torch targets); AI only if it lifts accuracy and still requires evidence.

## Verdict

Do **not** scale the current extension into the bulk engine. It proves detection + Trustpilot collect workarounds, but its runtime model (open options page, one real tab, serial `scanList`, no server) is structurally wrong for industry batches. Product to build now: a **local batch runner (CLI-first)** that reuses the same detector/classify/export core, with **bounded local browser concurrency**, **early-exit probing**, and a **golden-set gate** so every speed change is measured against the accuracy floor. Keep the extension as optional thin UI later — not the orchestrator for large jobs.

## What you should do

1. **Freeze accuracy contract** — Expand/maintain golden set; automate Vitest (or CLI eval) for classify + detector fixtures and a small live smoke set. Any concurrency/cache change must not regress floors.
2. **Extract shared library** — Pull `detector`, `path-probe`, `classify`, types, export, config out of “extension-only” packaging into a package/CLI can import (same rules, same verdicts).
3. **Ship CLI batch product** — e.g. `scan --query design --limit N --concurrency 2 --delay 1500 --out out/results.csv`. Stages: collect → resolve → scan → export; checkpoint/resume on disk (SQLite or JSONL), not dashboard IDB.
4. **Local browser engine** — Playwright (or Puppeteer) on the user’s machine for Trustpilot collect + site loads. Bounded concurrency (start 2–3 pages), shared browser, fewer cold tab creates than `chrome.tabs` churn.
5. **Speed without lowering accuracy** — Early-exit: if homepage already strong affiliate evidence → skip path-probe. Cache probe/HTML by domain+day. Parallelize path `fetch` same-origin only after junk baseline. Preserve “non-ok never none”.
6. **Defer AI** — Use only on `unknown` / weak partner_trade ambiguity, evidence-bound (per docs/10). Gate with golden labels; never replace URL evidence.
7. **Optional later** — Thin extension or small local UI that starts/monitors CLI jobs; CRM export remains format problem (CSV/JSON first).

## What you shouldn’t do

- Parallelize blindly inside options-page orchestrator / open many Chrome tabs from the extension.
- Build cloud worker fleet or managed browser SaaS this phase.
- Make AI the primary “has affiliate?” detector without golden eval.
- Full-site crawl or CAPTCHA bypass “for coverage”.
- Electron/Tauri desktop shell before CLI proves throughput + accuracy.
- Rewrite detector from scratch while moving runtimes — port first, then tune.

## Better / more efficient paths (effort → impact)

1. **Early-exit + probe cache in current stack** — Hours–days; cuts wall time a lot when many sites already have footer/platform hits; still batch-capped by 1-tab Chrome.
2. **CLI + Playwright local, concurrency 2–3, shared lib** — Days–1–2 weeks; unlocks industry-shaped batches on one machine without cloud.
3. **Human review queue for `unknown` only** — Small UI or spreadsheet column; lifts effective precision with little eng cost.
4. **AI semantic label on weak/ambiguous only** — After golden partner_trade cases exist; accuracy win, not speed win.

## My take — route from here

**Build the product as “local batch scanner → evidence CSV”, not “faster Chrome extension”.**  
Week path: (1) golden gate → (2) extract lib → (3) CLI skeleton with disk checkpoint → (4) Playwright collect/scan with concurrency 2 + early-exit → (5) compare wall time + golden vs extension baseline on same query/limit → (6) only then touch AI or multi-source.

Extension stays: installable demo / small runs / Trustpilot session convenience. Engine of record for large data = CLI local.

## Benefits

- Matches confirmed job: industry/category batch, not drip daily.
- Accuracy measurable before/after speed work.
- Local, no cloud ops; CSV/JSON handoff to CRM/Sheet already in scope.
- Reuses proven rule layers; avoids hallucination by keeping evidence-first.
- Clear ceiling then: if one PC isn’t enough later, queue design already fits workers — without buying cloud now.

## Trade-offs

- Two surfaces briefly (ext + CLI) until UI optional wrap.
- Playwright install / browser binary on each machine.
- Higher local concurrency increases block risk — must tune delay/concurrency per domain politeness.
- Industry scale still unclear quantitatively — measure pages-per-category first; SLA stays empirical.
- User accepted accuracy-first then need_both then clarified batch-not-daily — recommendation bets on batch; if later daily drip returns, CLI still serves both.

## Work checklist

- [ ] Define golden set + automated accuracy gate (recall/precision floors; never blocked→none).
- [ ] Extract detector/classify/path-probe/export into shared module usable outside WXT.
- [ ] CLI: collect/resolve/scan/export + resume from disk checkpoint.
- [ ] Local Playwright runner with concurrency ≤3, configurable delay, shared browser context strategy.
- [ ] Early-exit strong evidence; domain-day cache for probes/HTML.
- [ ] Benchmark: same query + limit — wall time, block rate, golden deltas vs extension baseline.
- [ ] Keep CSV/JSON schema stable (or versioned) with evidence URLs.
- [ ] Document recommended concurrency/delay; ethics note (no CAPTCHA bypass).
- [ ] Only after floors hold: optional AI on ambiguous labels; optional thin UI over CLI.

## Success metrics

- Golden: clear-affiliate recall ≥ 90%; 0 blocked-classified-as-none on evaluation set.
- 100% of `affiliate` (confirmed) rows in export have at least one openable evidence URL (spot-check sample ≥ 20).
- Throughput: ≥ 3× companies finished per hour vs current extension defaults on same machine/query (measure both).
- Resume: kill mid-batch → restart resumes without re-scanning saved domains.
- Local-only: full industry-sized category attempt runs with zero cloud services.
- Ambiguous rate: `unknown` + weak not exploding after speed changes (track %; no >+5pp unplanned rise on same set).
