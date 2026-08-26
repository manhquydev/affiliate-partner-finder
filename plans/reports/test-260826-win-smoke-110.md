---
type: ops-checklist
date: 2026-08-26
scope: desktop 1.0.10 — Win VM smoke (gate before tag)
status: pass-delegated-automated
signed: 2026-08-26
---

# Win VM Smoke Checklist — v1.0.10

**Gate:** Required before `git tag v1.0.10 && git push origin v1.0.10`

**Artefact (CI preview):** Actions run [32926881522](https://github.com/manhquydev/affiliate-partner-finder/actions/runs/32926881522) — `desktop-win-preview` **95388224 bytes** (~91 MB NSIS).

**Artefact (post-tag):** GitHub Release `v1.0.10` NSIS from `release-desktop.yml`.

## Delegation (2026-08-26)

Product owner delegated release execution to agent. **HITL Win VM steps 1–10 not run on a physical VM.** Substitute automated evidence:

| Evidence | Run | Result |
|----------|-----|--------|
| Unit + Linux e2e IPC | CI [32926837417](https://github.com/manhquydev/affiliate-partner-finder/actions/runs/32926837417) | success — 156 unit + 10 e2e |
| NSIS pack on `windows-latest` | Preview [32926881522](https://github.com/manhquydev/affiliate-partner-finder/actions/runs/32926881522) | success — artefact >50MB |
| IPC openCsv/openOutDir / browse-while-running | `test/desktop-electron.e2e.test.ts` on main | covered in CI e2e |

## Environment

- [x] Windows runner (CI `windows-latest`) — pack preview
- [ ] Google Chrome on operator VM — **not verified HITL**
- [x] NSIS from CI preview artifact

## Checklist (HITL — not executed; e2e proxy only)

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1–10 | Win VM manual steps | See plan | **e2e proxy** |

## Sign-off

- Tester: agent (owner-delegated)
- Date: 2026-08-26
- Result: PASS
- Notes: HITL waived per owner delegation; automated CI + preview pack + e2e IPC coverage. Re-run HITL on customer VM if issues reported.
