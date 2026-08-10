---
title: "Phase 6: DEFERRED DeepSeek ambiguous label"
status: cancelled
phase: 6
effort: "—"
dependencies: []
---

<!-- Updated: Red Team Review 2026-08-10 -->

# Phase 6: DEFERRED DeepSeek ambiguous label

## Overview

**Cancelled for this cook** (RT-12). DeepSeek ambiguous labeling is deferred to a **follow-up plan**. No implementation in this plan. User has a DeepSeek API key available for that later work.

## Requirements

- [x] Status `cancelled` in frontmatter
- [x] No `cli/ai*.ts`, no `--ai-ambiguous`, no cloud LLM deps in this plan’s ship gate
- [ ] Follow-up plan (later): optional evidence-bound DeepSeek label for ambiguous rows only

## Deferred scope (follow-up plan only)

When revisited:

- Flag off by default; env `DEEPSEEK_API_KEY`
- Call only on ambiguous/weak cases with existing evidence — never invent URLs/loadStatus
- Rule verdict remains source of truth; AI fields optional (prefer JSON-only)
- Evidence-bound prompt; fail-open on API errors
- Still gated by golden / verify-golden floors first

## Related Code Files

- None this plan — do not create AI modules now.

## Implementation Steps

1. **This cook:** skip entirely.
2. Future: open a new plan after MVP CLI accuracy floor ships; use user’s DeepSeek API then.

## Todo

- [x] Mark cancelled / deferred out of ship gate
- [ ] Follow-up plan authorship (separate from this cook)

## Success Criteria

- [x] This plan ships without DeepSeek / cloud LLM as a gate
- [x] Phase 6 not required for plan success criteria in `plan.md`

## Risk Assessment

| Risk | L×I | Mitigation |
|------|-----|------------|
| Same-plan cloud LLM vs local MVP | H | Deferred (RT-12); reject soft keep-in-success |

## Rollback

N/A — nothing implemented.

## Test plan

- [x] N/A this plan

## Validation Log

> `--auto` validation adopts the Decisions section in `plan.md` (and Red Team Review Accept table). Confirm DeepSeek remains out of this cook; user API noted for follow-up only.
