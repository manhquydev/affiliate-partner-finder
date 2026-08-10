# Live verification — design pilot 200

Date: 2026-08-10  
Job: `out/design-pilot-200/`  
Command: `npm run scan -- --query design --limit 200 --max-pages 50 --concurrency 2 --delay-ms 1500 --headed-scan`

## What worked

### Collect (Trustpilot)
- Collected **200/200** companies in **25 pages** (~8/page after dedupe; often ~10 raw/page).
- Confirms theme pages are walkable far beyond the old hard `maxPages=40`.
- Trustpilot `totalPages` on design search is large (user claim ~1000); pilot did not walk all — estimate **~10k domains** if `limit=10000 max-pages=1000`.
- Hardened during run: goto retry, per-page `companies.json` checkpoint, continue-on-partial after network blip.

### Scan (Playwright)
- After fixing tsx `__name` inject (`cli/injectable.ts`), detector works on real sites (e.g. nordicnest affiliate URL captured).
- Final export **200** rows: verdict `affiliate=20`, `partner_trade=36`, `none=88`, `unknown=56`.
- loadStatus: `ok=144 (72%)`, `blocked=29`, `timeout=25`, `error=2`.
- **blocked→none = 0** (anti-hallucination holds).
- Wall time ~4h for 200 scans @ concurrency 2 with full path-probe (≈1–2 companies/min).

## Limits exposed (real)

1. **Automation bot/CF walls** — ~14.5% `blocked` even headed Chrome (vecteezy, madeindesign, design-bestseller, finnishdesignshop…). Extension real-user session may pass some of these.
2. **Timeouts** — ~12.5% with `tabTimeoutMs=20s`; path-probe fan-out can also hang a worker (`lehtodesign.com` froze Promise.all until kill/resume).
3. **Throughput floor for industry-scale** — linear estimate: 10k companies × ~90s effective / 2 workers ≈ **5+ days** at current ethics delay+probe; 1000 Trustpilot pages collect alone ≈ hours.
4. **Golden live gate FAIL on this run** — `verify-golden.mjs`: affiliate-high **2/4**, golden match **6/13 present**. Failures mostly blocked automation + some `partner_trade` vs expected `none` (rule precision on weak partner keywords).
5. **Resume semantics** — `timeout`/`error` are non-terminal → `--resume` requeues all soft failures (28 pending at one point). Good for quality, expensive for finishing.
6. **tsx inject** — without stripping `__name`, nearly 100% scan failures (caught mid-pilot).

## Artifacts

| File | Role |
|------|------|
| `companies.json` | 200 Trustpilot companies snapshot |
| `results.jsonl` | Append-only scan log |
| `results.csv` / `results.json` | Final export |
| `verify-golden.txt` | Live acceptance printout |
| `run.log` | Full CLI log |

## Scaling guidance (from this pilot)

| Target | Feasible now? | Notes |
|--------|---------------|-------|
| 200 design companies | Yes (~4h) | Proven |
| Full ~1000 TP pages (~10k) | Collect yes / scan costly | Need early-exit, higher timeout budget, hang watchdog, maybe scan via persistent profile |
| Golden ≥90% live | Not yet on Playwright | Improve session realism; don't treat blocked as ranking failures |

## Next engineering (evidence-backed)

1. Watchdog timeout around whole `scanOneCli` (including path-probe loops).
2. Optional `--accept-failures` so resume doesn't replay all timeouts.
3. `--early-exit` for throughput on clear affiliates (default still off).
4. Optional scan through same persistent Chrome profile as collect for lower block rate.
5. Only then attempt `limit=10000 --max-pages=1000` overnight job.
