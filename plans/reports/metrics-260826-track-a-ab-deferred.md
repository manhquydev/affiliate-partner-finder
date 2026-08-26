---
date: 2026-08-26
scope: Track A A/B phase-03
status: deferred
---

# Track A A/B — Deferred (2026-08-26)

## Preflight result

| Gate | Status | Evidence |
|------|--------|----------|
| Sample ≥50 domains | **FAIL** | `track-a-none-ok-sample-domains.txt` has **40** lines |
| Merge CSV on dev machine | **MISSING** | No `out/design-full-10k/` in workspace |
| `scripts/track-a-ab.sh` allowlist | **READY** | Denies `design-full-10k`; requires `out/track-a-*` |
| Phase 1 merged | **PASS** | main @ `5de372e` |
| Phase 2 closed | **PASS** | PR phase-02 hygiene |

## Decision

**Defer Track A A/B execution** until:
1. Ops provides merge artefact or regenerates sample ≥50 domains with provenance
2. Operator runs `scripts/track-a-ab.sh` preflight on machine with Chrome profile

## Next action (ops)

```bash
./scripts/track-a-ab.sh   # preflight only
# extend sample to ≥50, seed companies.json, run control then treatment sequentially
```

No change to production scan flags (network-evidence remains default OFF).
