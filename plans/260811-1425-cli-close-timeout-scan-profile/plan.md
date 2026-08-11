---
title: "CLI scan harden: close timeout + CF scan profile"
date: 2026-08-11
status: active
---

# Plan — 260811-1425 — close-timeout + CF scan profile

## Outcome
Batch never stalls hours on one site after budget; site scans reuse collect Chrome profile cookies to cut CF blocks.

## Status
- Phase 1–3: **done** (closeQuietly, `--scan-profile`, tests 74/74)
- Phase 4: **in progress** — `out/design-pilot-200d` with `--scan-profile`
- KeepAlive fix: never close the last Chrome window or the profile process exits

## Acceptance
1. closeQuietly ≤ ~3s ✅
2. `--scan-profile` ✅
3. tests green ✅
4. golden trend on 200d 🔄
