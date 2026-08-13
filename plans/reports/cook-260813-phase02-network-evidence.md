# Cook Phase 02 — network evidence layer

**Timestamp:** 2026-08-13  
**Plan:** `plans/260813-0816-network-lazy-settle-quality-track-a/phase-02-network-evidence-layer.md`  
**Scope:** PHASE 2 only (CLI observe + classify behind flag)

## STATUS: DONE

## What shipped

| Item | Detail |
|------|--------|
| Collector | `lib/network-collector.ts` — `addUrl` / `matchedPlatforms` (pure) |
| CDN allowlist | `NETWORK_CDN_ALIASES`: `dwin1.com`→awin, `impactradius.com` / `impactradius-event.com`→impact.com |
| CLI wire | `cli/scan.ts`: `page.on('request'\|'response')` **before** `goto`; detach in `finally` |
| Flag | `--network-evidence` **default OFF** — collect + classify only when set |
| Desktop | optional `JobOptions.networkEvidence` → argv |
| Version | `DETECTOR_VERSION` **1.1.0** (networkHits schema / CLI layer) |
| Tests | collector + alias/FP + desktop argv |

## Locks

- Observe-only — **no** `page.route`
- Matcher from phase 1; classify merge gated by flag (no default-path verdict flips)
- Live shards untouched (flag off; no process kill)

## Flag / env

```bash
npm run scan -- --query design --limit 5 --out ./out/net-smoke --network-evidence
```

Desktop: set `networkEvidence: true` on job options (default omitted).

## Smoke notes (dev)

Manual demo (operator): relaunch a small resume with `--network-evidence` on a known Awin/Impact affiliate homepage; expect `evidence.networkHits` nonempty when tracking pixels fire, CSV `method=network` when DOM platform/link empty. Not run in this cook (no live browser smoke / no shard touch).

## Tests

```
npm test -- test/network-hosts.test.ts test/network-collector.test.ts \
  test/classify.test.ts test/export.test.ts test/desktop-adapter.test.ts \
  test/detector-config.test.ts test/detector.test.ts
→ 92 passed
```

## Not done

- Extension `chrome.webRequest` parity (non-goal)
- Golden / A1–A7 measurement (phase 4)
- Always-on classify without flag (intentionally deferred)

## Commit

Not committed unless user asks.
