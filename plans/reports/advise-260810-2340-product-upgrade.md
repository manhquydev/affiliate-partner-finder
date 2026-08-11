---
title: "Advise — product upgrade after simple CSV HITL"
date: 2026-08-10
status: complete
---

# Advise — 260810-2340 — nâng cấp sản phẩm

## Reframed goal
CSV human-in-the-loop (`true|false|unknown`) + batch local; nâng cấp cân bằng unblock / miss / overnight; DeepSeek được phép khi đã có accuracy floor; metric = phân loại rõ ràng (golden + simpleHit).

## Advice (do this)
1. Khóa accuracy floor trước AI: probe-incomplete≠false, giữ evidence khi timeout budget, scan profile chống CF → `verify-golden` PASS.
2. CSV triage v2: thêm `url_goi_y`, sort true→unknown→false.
3. Plan DeepSeek mới: chỉ ambiguous/weak, evidence-bound, fail-open, không ghi đè rules.
4. Overnight ops: `--resume --accept-failures`; `--early-exit` sau khi floor xanh.

## Avoid
- Coi AI là truth; ép unknown→false; scale extension làm bulk engine.

## Work checklist
- [ ] Commit fix probe-incomplete + semantics tests
- [ ] Pilot headed + profile → golden PASS
- [ ] CSV `url_goi_y`
- [ ] Plan phase DeepSeek
- [ ] Overnight design crawl
