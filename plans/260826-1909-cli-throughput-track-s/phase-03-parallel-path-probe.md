---
phase: 3
title: "Parallel path-probe"
status: pending
priority: P1
effort: "1d"
dependencies: [2]
---

# Phase 3: Parallel path-probe

## Overview

Add `--probe-parallel` with **4th positional** `parallelBatch` (default `1` = today). Batch size **3 max**. **No stop-on-hit** — always probe all 28 paths + junk unless outer 90s budget fires.

## Requirements

- Functional: `--probe-parallel` sets `parallelBatch=3`; `--probe-batch-size` clamped 1..3
- Non-functional: default OFF; extension unchanged (2-arg inject)

## Architecture

```typescript
// lib/path-probe.ts — inject-safe
export async function pathProbe(
  origin: string,
  paths: string[],
  fetchTimeoutMs = 8000,
  parallelBatch = 1,
): Promise<PathProbeResult>
```

In-page: chunk paths by `parallelBatch`, `Promise.all` per chunk, sequential chunks.

**Recall note:** Sequential often hits 90s cap (`cli/scan.ts:168`) before all paths run. Parallel may complete more paths in same budget — acceptable if evidence-backed; gate catches false negatives.

## Related Code Files

- Modify: `lib/path-probe.ts`, `cli/scan.ts`, `cli/index.ts`
- Extend: `test/path-probe.test.ts` — parallel batch + inject self-containment (`toString` no imports)

## Implementation Steps

1. Implement batched parallel in `pathProbe`
2. Wire CLI flags; default OFF
3. Extend inject test for 4-arg parallel
4. Unit: parallel vs sequential same results on mock timing fixture
5. Do not add stop-on-hit

## Success Criteria

- [ ] Default sequential bit-identical on existing tests
- [ ] `--probe-batch-size` >3 rejected or clamped to 3
- [ ] Inject self-containment test passes with `parallelBatch=3`

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| WAF burst | batch≤3 |
| inject __name | `cli/injectable.ts` + test |

<!-- Updated: Red Team RT-S-01 reframe, RT-S-02 removed stop-on-hit, RT-S-06 batch≤3, RT-S-07 positional API -->
