---
title: "Phase 1: Export companies.csv"
status: todo
priority: P1
effort: 1h
dependencies: []
---

# Phase 1: Export companies.csv

## Context Links

- Plan: [plan.md](./plan.md)
- `lib/export.ts` (`csvCell`, `toSimpleCSV`)
- `lib/types.ts` `Company`
- `lib/resolve.ts` `domainToUrl` (currently unexported)
- `test/export.test.ts`

## Overview

Pure CSV helper for the lite list. No Playwright. Reuse `csvCell`. Do not touch `toSimpleCSV` columns.

## Requirements

- Functional: `toCompaniesCSV(companies: Company[]): string` header `stt,ten_website,link`
- `stt` = 1-based index in array order (collect order)
- `ten_website` = `company.name` or fallback `company.domain` if name empty
- `link` = `domainToUrl(company.domain)` (`https://` unless already `http(s)://`)
- Non-functional: formula-injection guard via existing `csvCell`; no `=HYPERLINK(`

## Architecture

```
Company[]  →  toCompaniesCSV  →  "stt,ten_website,link\n1,Name,https://domain\n"
```

Export `domainToUrl` from `lib/resolve.ts` (or a one-line sibling `domainToWebsiteUrl`) so CLI and export share the same URL rule as cheap resolve.

Empty input: header-only string is OK for the helper; CLI/desktop must not write that file on failed collect (phase 2/3).

## Related Code Files

- Modify: `lib/resolve.ts` — export domain→URL helper
- Modify: `lib/export.ts` — add `toCompaniesCSV`
- Modify: `test/export.test.ts` — header, rows, empty name, `name='=1+1'` prefixed, domain starting `-` prefixed, comma in name quoted, existing `toSimpleCSV` unchanged

## Implementation Steps

1. Export sync `domainToUrl` from `lib/resolve.ts` without changing `resolve()` default. Collect already sets `name: u.name || domain` (`cli/collect.ts:104`); CSV fallback is extra.
2. Add `COMPANIES_CSV_COLUMNS = ['stt','ten_website','link']` and `toCompaniesCSV` using `csvCell` on every cell including `stt`.
3. Tests as above; `toSimpleCSV` header still `ten_cong_ty,website,ket_qua,huong_dan`.

## Todo

- [ ] Export domain URL helper
- [ ] `toCompaniesCSV` + tests

## Success Criteria

- [ ] `npx vitest run test/export.test.ts` green
- [ ] No `=HYPERLINK` in source
- [ ] Full simple CSV contract unchanged

## Risk Assessment

| Risk | Signal | Response |
|------|--------|----------|
| Name contains comma/quote | test with comma | csvCell already quotes |
| Domain already has scheme | `http://x.test` | domainToUrl must not double-prefix |

## Security Considerations

Reuse `csvCell` (`lib/export.ts` formula-injection guard). Never emit spreadsheet formulas for the clickable-name idea.
