---
phase: 2
title: "Plan hygiene + extension gate"
status: done
priority: P2
effort: "2-4h"
dependencies: [1]
---

# Phase 2: Plan hygiene + extension gate

## Overview

Close stale plan slugs; run one manual extension golden verification so v1 plan phase-5 checkbox can be checked or explicitly waived.

## Requirements

- Functional: Update `plans/260812-0939-windows-desktop-gui-electron-shell/plan.md` status → `completed` with note pointing to 1.0.10.
- Functional: Extension `npm run build` + manual `design` query → export JSON → `node test/verify-golden.mjs`.
- Non-functional: Docs-only changes in this phase; no desktop code.

## Related Code Files

- Modify: `plans/260812-0939-windows-desktop-gui-electron-shell/plan.md`
- Modify: `plans/260810-1229-affiliate-partner-finder-v1/plan.md` (phase-5 live gate)
- Report: `plans/reports/test-260826-extension-golden-manual.md` (create)

## Implementation Steps

1. Mark desktop GUI plan completed; link v1.0.10 release as deliverable.
2. Run extension build; document manual golden steps or results.
3. Update v1 plan success criteria with PASS/PARTIAL + reason.
4. Archive stale `status: pending` on Track A plan 260813-0816 → `completed (code-only)` if code already merged.

## Success Criteria

- [x] Plan 260812 frontmatter `status: completed`
- [x] Extension golden report exists (PARTIAL — unit/build PASS; live deferred)
- [x] No contradictory `in-progress` desktop plan on main after 1.0.10 ship

## Risk Assessment

Manual golden may fail on Cloudflare — document as environment blocker, not code blocker for desktop wave.
