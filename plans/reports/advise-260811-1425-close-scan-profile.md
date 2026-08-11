---
title: "Advise — close timeout + CF scan-profile upgrade"
date: 2026-08-11
status: complete
---

# Advise — 260811-1425

## Confirmed
Ship closeQuietly + `--scan-profile`, then re-scan full design 200 headed with the collect CF profile.

## Do
1. Bound Playwright closes (done in cook)
2. Reuse persistent profile for site scans (done)
3. Re-scan 200d; measure golden affiliate-high and blocked rate vs 200c
4. If CF challenge pops: pass once in the opened Chrome window, `--resume`

## Avoid
CAPTCHA bypass; concurrent two processes on same profile; treating unknown as false
