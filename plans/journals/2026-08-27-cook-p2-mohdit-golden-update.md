---
title: Cook P2 mohd.it golden update
date: 2026-08-27
summary: mohd.it partner_trade/low; none-set 5→4; precision tests; verify-golden mohd.it OK
---

# Cook P2 mohd.it golden update

## What happened
P2 mohd.it golden update. Live B2B trade page → partner_trade/low. NONE_CASES 5→4. Precision tests P-WW/OZ/MO/NONE/BLOCK. docs/07 §2+§5 and docs/05 §8 updated.

## Verification
vitest P2 50/50; npm test 194/194. verify-golden treatment: mohd.it OK; vecteezy still blocked. Isolation green. probe-parallel still OFF. Did not tighten trade keyword.

## Next steps
P3 golden-13 job (ops). Do not start P6. Ask commit P2.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
