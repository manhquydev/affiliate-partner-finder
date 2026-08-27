# Research — Track S path-probe algorithm

**Date:** 2026-08-27  
**Question:** Có cần thuật toán probe mới sau A/B directional PASS?

## Executive Summary

**Không cần thuật toán mới cho Phase 5.** Batch parallel hiện tại (junk tuần tự → chunks of 3 × `Promise.all`) đạt **37.6% wall-clock** với **0 regression** trên cohort sạch. Tối ưu thêm là optional sau n=200 production gate.

## Thuật toán hiện tại

```text
1. timedFetch junk path → baseline status (soft-404 guard if junk=200)
2. FOR each path chunk size=batch (1..3):
     Promise.all(probeOne(path))  // 8s abort each
3. Hit iff status ≠ junk AND ∈ {200,301,302}
4. No stop-on-hit — all 28 paths attempted within 90s budget
```

**Properties:** same-origin inject; ethics-friendly batch cap; anti-hallucination junk-first unchanged.

## So sánh hướng (nếu cần sau này)

| Approach | Speedup potential | Risk | Verdict |
|----------|-------------------|------|---------|
| **Current batch-3** | +37.6% measured | Low | **Keep** |
| Adaptive batch by RTT | +5–15% est | Medium race | Defer |
| Priority paths first | Recall↑ maybe | Changes A/B baseline | Defer |
| Stop-on-first-strong-hit | Speed↑ | FN on path-only programs | **Reject** (plan) |
| domcontentloaded default | goto faster | Separate from probe | **Done** (scan.ts) |

## Bottleneck phân rã (post-fix)

| Phase | Dominant? |
|-------|-----------|
| path-probe | **Yes** — parallel targets this |
| goto+settle | Reduced via domcontentloaded |
| blocked/timeout | Track B — not probe algo |

## Recommendation

Ship current algorithm. Revisit only if n=200 A/B shows speedup <25% **with clean isolation**.

## Unresolved

- Probe ms not recorded on gate run (`profile-timing` OFF) — optional diagnostic rerun both arms.
