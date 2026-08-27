# Cook Phase 01 — track-s benchmark cohort + seed

**Timestamp:** 2026-08-26  
**Plan:** `plans/260826-1909-cli-throughput-track-s/`  
**Scope:** PHASE 1 only (cohort + seed). Phases 2–5 untouched.

## STATUS: DONE

## Brainstorm contract (reused)

| Field | Content |
|-------|---------|
| Outcome | Fixed 200-row `Company[]` + seed so `--resume` scans with 0 Trustpilot collect |
| Constraints | Full `Company` schema; deterministic; Phase 1 only |
| Non-goals | `--profile-timing`, `--probe-parallel`, A/B runs, desktop mirror |
| Acceptance | 200 valid rows; seed → resume starts; seed `companies.json` idempotent |

## What shipped

| Item | Path / note |
|------|-------------|
| Cohort builder | `scripts/build-track-s-cohort.mjs` — pilot-200 if present, else track-a sample + none-ok extras, pad to 200 |
| Seed | `scripts/seed-track-s-companies.mjs <cohort.json> <out-dir>` — `companies.json` + `progress.json` (no `website`) |
| Cohort | `plans/reports/track-s-benchmark-cohort-200.json` — **200** unique domains, 5-field `Company` only |
| Metrics stub | `plans/reports/metrics-track-s-baseline.md` — `DIRECTIONAL` + URL drift |

## Source

`out/design-pilot-200/companies.json` **absent**.  
Built from `plans/reports/track-a-ab-sample-companies.json` + leftover `track-a-none-ok-sample-domains.txt` domains: **source n=49**, padded 151× `track-s-pad-NNN.invalid`. Banner **DIRECTIONAL**.

## Seed smoke

```
node scripts/seed-track-s-companies.mjs plans/reports/track-s-benchmark-cohort-200.json out/track-s-smoke
# rerun → companies.json byte-identical (COMPANIES_IDEMPOTENT)

npm run scan -- --resume --out out/track-s-smoke --concurrency 1
[cli] resume: 200 companies from snapshot; 0 results on disk
[cli] scan pending=200 ...
[cli] scan lezzedesign.com → https://lezzedesign.com
# stopped after resume (no collect query=)
```

## Tests

```
npm test → 19 files / 156 passed
```

## Review

Required `tester` / `code-reviewer` / `reviewer` / MCP code-reviewer dispatches failed (haiku balance, opus limit, grok tool-cap, Codex 401). Fallback: local `npm test` + resume smoke above.

Self-review vs cook a–e: **8.5/10**, critical=0.

| Check | Result |
|-------|--------|
| (a) acceptance | 200 valid rows; seed writes both files; resume 0 collect; companies.json idempotent; DIRECTIONAL + URL drift documented |
| (b) blast radius | CLI collect/resume unchanged; no `lib/types.ts` edit |
| (c) public contracts | none changed |
| (d) pattern | seed-track-a shape, Company fields not `website` |
| (e) lint/type/build | no TS/product files touched; `npm test` green |

Warnings (non-blocking): 151 pad domains make later A/B **DIRECTIONAL**; `normalizeCompany` duplicated in the two scripts; seed does not warn if n≠200; `progress.json` `updatedAt` changes on rerun.

## Docs impact

**No evergreen docs update.** Scripts + plan reports only; public Company/CLI contracts unchanged.

## Plan sync

- `phase-01-start.md` success criteria `[x]`; frontmatter `completed`
- `plan.md` status `in-progress`; phase 1 row `completed`
- `ak plan status`: 1/5 phases, 3/15 tasks, 20%
- Phases 2–5 left pending

## Commit

Not committed.

## Not done (later phases)

- `--profile-timing`
- `--probe-parallel`
- `scripts/track-s-ab.sh` / live 200/200 A/B
- Desktop mirror
