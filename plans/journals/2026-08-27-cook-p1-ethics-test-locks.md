---
title: Cook P1 ethics test locks
date: 2026-08-27
summary: "P1 gates green: stop-on-hit, sibling abort, TRIAL FAIL, GUI default-OFF; 53/53 + track-s 32/32"
---

# Cook P1 ethics test locks

## What happened
Cook P1 test locks landed. Isolation 3/3 unchanged. Added path-probe stop-on-hit cardinality, later-chunk 200, batch-4 clamp, junk-first, sibling abort; compare TRIAL FAIL fixture; HTML #probeParallel unchecked.

## Verification
vitest 6 files 53/53; npm run test:track-s 7 files 32/32. No production ethics-clamp edits. probe-parallel remains OFF.

## Next steps
P2 mohd.it golden update. Do not start P6. Ask user to commit P1.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
