---
type: code-reviewer
date: 2026-09-01
lens: Security Adversary
---

# Red team: Security

Opus code-reviewer subagent failed (rate limit). Controller ran this lens against the repo.

## Finding 1: openCsv must apply isPathInside to companies.csv
- **Severity:** High
- **Location:** Phase 3, open-csv
- **Flaw:** Plan says reuse resolveJobCsv but existing handler only joins results.csv then realpath+isPathInside. A naive else-join without the same escape check would be a new path.
- **Failure scenario:** crafted out dir / symlink.
- **Evidence:** `desktop/main.ts:292-299` open-csv uses `join(out,'results.csv')` then `resolveExistingPath` + `isPathInside(runsRoot, real)`.
- **Suggested fix:** resolveJobCsv result must still pass resolveExistingPath + isPathInside before shell.openPath.

## Finding 2: csvCell must wrap ten_website and link
- **Severity:** Medium
- **Location:** Phase 1
- **Flaw:** Plan states reuse csvCell; confirm both name and link go through it (link `https://` is safe; name `=cmd` is not).
- **Evidence:** `lib/export.ts:82-85` formula guard; collect `cli/collect.ts:104` `name: u.name || domain`.
- **Suggested fix:** tests with name `=1+1` and domain `-evil.com` (leading dash).

Status: DONE
