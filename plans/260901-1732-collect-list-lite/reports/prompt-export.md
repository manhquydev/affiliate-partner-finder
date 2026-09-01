Implement Phase 1 only of plan plans/260901-1732-collect-list-lite. Do not implement CLI or desktop.

Repo: /home/manhquy/Downloads/affiliate-partner-finder

Files you MAY modify:
- lib/resolve.ts — export existing domainToUrl (do not change resolve() behavior)
- lib/export.ts — add toCompaniesCSV
- test/export.test.ts — tests only

Do NOT modify cli/, desktop/, docs/, or other lib files.

Contract:
- toCompaniesCSV(companies: Company[]): string
- Header exactly: stt,ten_website,link
- stt 1-based array order
- ten_website = company.name || company.domain
- link = domainToUrl(company.domain)
- Every cell through existing csvCell (formula injection: name '=1+1' and domain starting with -)
- No =HYPERLINK
- toSimpleCSV header MUST remain ten_cong_ty,website,ket_qua,huong_dan

Verify: npx vitest run test/export.test.ts
Skip project-wide lint/format.
When done, reply with files changed and test result only.
