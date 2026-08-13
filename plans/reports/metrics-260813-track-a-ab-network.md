# Metrics — Track A network A/B (DIRECTIONAL)

**Timestamp:** 2026-08-13 10:30 +07  
**Label:** **DIRECTIONAL only** (n=40 ≪ baseline A2≥200) — **NOT A2 PASS / NOT DoD met**  
**MUST NOT claim:** `unknown%`↓ from Track A

## Arms

| Arm | Out | Flags |
|-----|-----|-------|
| Control | `out/track-a-ab-control` | early-exit; **no** network/lazy |
| Treatment | `out/track-a-ab-network` | early-exit + **`--network-evidence`** |

Sample: `plans/reports/track-a-ab-sample-companies.json` (40 `none@ok`-biased domains from merge)

## Results

| Metric | Control | Treatment |
|--------|--------:|----------:|
| n | 40 | 40 |
| load ok | 36 | 36 |
| unknown | 4 | 4 |
| none | 35 | 35 |
| affiliate among ok | 0/36 (0%) | 0/36 (0%) |
| platformHits nonempty | 0 | 0 |
| networkHits nonempty | 0 | **1** |
| method=network | 0 | **1** |
| none→positive flips (paired ok) | — | **0** |

### Network hit detail

- Domain: `learn.thedesignforchange.com`
- `networkHits`: `['firstpromoter']`
- `loadStatus`: **blocked** → verdict stayed **unknown** (classify gate correct; not a false affiliate)

## Interpretation

1. **Wire works:** treatment produced `method=network` / `networkHits` where control had none.  
2. **No FN lift on this none@ok design cohort** — expected if sites truly lack affiliate pixels; directional A2 **not** improved.  
3. Next measurement (separate plan): stratified sample including known-affiliate ok domains + remaining none@ok, n≥200, before any DoD claim.  
4. Live 10k untouched (no Track A flags); TOTAL≈4243 at report time.

## A1–A7 snapshot (this run)

| ID | Status |
|----|--------|
| A1 | No lift (0%→0% affiliate@ok) |
| A2 | Directional signal only (1 network row); **fail vs ≥40 method=network target** |
| A3 | Not run |
| A4/A5 | Unit suite green (131) — separate |
| A6/A7 | Not instrumented; sample conc=2 sequential under live 10k |

Baseline ref: `plans/reports/metrics-260813-track-a-baseline.md`
