---
title: "Live verify — design-pilot-200d (scan-profile + closeQuietly)"
date: 2026-08-11
status: complete
---

# Live verify — 260811-1633 — design-pilot-200d

## Run
- Out: `out/design-pilot-200d`
- Flags: `--resume --scan-profile --accept-failures --concurrency 2 --delay-ms 1500`
- Completed: **200/200** exported
- Export: true=60 false=87 unknown=53

## vs 200c (headed, no scan-profile)
| Metric | 200c | 200d |
|--------|------|------|
| ok% | 68.0 | **73.5** |
| ket true | 54 | **60** |
| ket unknown | 64 | **53** |
| affiliate | 18 | **21** |
| golden match | 6/13 | **7/13** |
| affiliate-high | 2/4 | **3/4** (design-bestseller recovered) |
| non-ok→false | 0 | 0 |

## Golden
FAIL — still missing **vecteezy.com** (blocked). Weak-noise PT on thorvald/mohd/pazzo unchanged.

## Floor
non-ok→false=0; blocked→none=0; no batch hang (closeQuietly).

## Ship
Code: closeQuietly + `--scan-profile` + keepAlive. CSV ready for human triage.
Next optional: retry vecteezy after manual CF in profile; csv `url_goi_y`; DeepSeek later.
