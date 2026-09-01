---
title: "Phase 4: Docs and regression"
status: todo
priority: P2
effort: 1h
dependencies: [2, 3]
---

# Phase 4: Docs and regression

## Context Links

- Plan: [plan.md](./plan.md)
- `README.md` Local CLI + Desktop GUI
- `docs/desktop-windows.md` Cách dùng step 2 + Mở CSV
- `PRODUCT.md` Capabilities (Start always collect then scan)
- `docs/06-data-schema.md` Company schema (optional one-line companies.csv)

## Overview

Document lite as a first-pass sibling. Do not present it as replacing Full. Run focused tests plus the desktop-adapter / export / windows-parity set.

## Requirements

- Functional: customer docs name the button **Lấy danh sách** and CSV columns `stt,ten_website,link`
- CLI README: `--collect-only` one bullet; resume still Full
- PRODUCT.md: typical session includes optional list-only first pass
- Non-functional: no new evergreen architecture doc; smallest owning surfaces only

## Architecture

Docs follow existing Vietnamese customer voice. Do not add a new docs/NN file.

## Related Code Files

- Modify: `README.md`
- Modify: `docs/desktop-windows.md`
- Modify: `PRODUCT.md` (operating context + capabilities)
- Optional one sentence: `docs/06-data-schema.md` if export formats are listed there
- No detector/classify edits

## Implementation Steps

1. Desktop docs: after keyword+limit, user may **Lấy danh sách** (CSV 3 cột) or **Bắt đầu** (quét affiliate). Mở CSV: results.csv nếu có, không thì companies.csv.
2. README CLI: `--collect-only` next to `--query`/`--limit`.
3. PRODUCT.md: Capabilities — list-only remains local, no scan; Full must remain.
4. Regression: `npx vitest run test/export.test.ts test/desktop-adapter.test.ts test/windows-parity.test.ts` plus new collect-only/job-csv tests. Do not weaken existing tests.
5. If e2e file changed, run that file only (`vitest.e2e.config.ts` pattern already used).

## Todo

- [ ] Customer + PRODUCT copy
- [ ] Focused vitest
- [ ] Confirm Full scan copy still accurate

## Success Criteria

- [ ] Docs never say Start was replaced
- [ ] Column names match code exactly
- [ ] Focused tests green
- [ ] `toSimpleCSV` still four columns

## Risk Assessment

| Risk | Signal | Response |
|------|--------|----------|
| Docs describe HYPERLINK 2-col | mention of HYPERLINK | delete; 3-col only |
| Version badge churn | README version table | only mention behavior, no version bump in this phase unless ship skill later |

## Security Considerations

None beyond existing local-files copy.
