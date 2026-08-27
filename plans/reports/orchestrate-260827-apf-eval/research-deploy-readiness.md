---
type: researcher
date: 2026-08-27
scope: desktop deploy readiness — 1.0.10 polish, smoke, release blockers, compile debt
tree: /home/manhquy/Downloads/affiliate-partner-finder
head: 8e50bed (main == origin/main)
tag: v1.0.10 → 86b485a
---

# Research Report: Desktop Deploy Readiness (1.0.10)

**Researched:** 2026-08-27  
**Repo:** `affiliate-partner-finder` @ `main` `8e50bed`  
**Authority conflict:** `plans/reports/brainstorm-260826-ci-and-release-gap.md` and plan `260826-0909` still say “no tag / smoke pending”. Live git + GitHub contradict that.

## Table of contents

1. [Executive Summary](#executive-summary)
2. [Research Methodology](#research-methodology)
3. [Key Findings](#key-findings)
   - [1. Technology Overview](#1-technology-overview)
   - [2. Current State — four waves](#2-current-state--four-waves)
   - [3. Best Practices vs this repo](#3-best-practices-vs-this-repo)
   - [4. Security Considerations](#4-security-considerations)
   - [5. Performance Insights](#5-performance-insights)
4. [Comparative Analysis](#comparative-analysis)
5. [Implementation Recommendations](#implementation-recommendations)
6. [Resources & References](#resources--references)
7. [Appendices](#appendices)
8. [Unresolved Questions](#unresolved-questions)

## Executive Summary

**v1.0.10 is already shipped.** Tag `v1.0.10` exists locally and on `origin`. GitHub Release published 2026-08-26T03:42:34Z with NSIS 95.3 MB, AppImage 119.9 MB, `.deb` 93.6 MB. Customer docs (`docs/desktop-windows.md`) correctly point at Latest `v1.0.10`. CI-on-push and Desktop Pack Preview exist and last runs on `main` are green.

**The 1.0.10 customer path is done as a binary.** Remaining deploy work is **integrity + next-version hygiene**, not “cut a tag”.

Four waves, current truth:

| Wave | Status | One-line |
|------|--------|----------|
| **1.0.10 polish** | **DONE on release tree** | PR #7 IPC/browse-while-running is in `v1.0.10`. Extra WT polish (`--probe-parallel` checkbox) is **1.0.11**, do not mix. |
| **Customer smoke** | **PAPER PASS** | `test-260826-win-smoke-110.md` has `- Result: PASS` but HITL Win VM steps 1–10 **never ran**. Proxy = Linux e2e + Windows pack. Download count on all 1.0.10 assets = **0**. |
| **Release blockers** | **1.0.10 unblocked** | Next ship blocked by dirty Track S tree, unsigned SmartScreen, plan-doc drift, `tsc` not in CI. |
| **Compile debt** | **RED, not a 1.0.10 gate** | `npm run compile` → **33 errors**, exit 2. CI never runs it. `cli/` excluded from `tsconfig.json`. |

**Recommendation:** treat 1.0.10 as closed. Do **not** retag. Next customer binary is 1.0.11 after: isolate Track S, optional real HITL smoke, compile split-config, then tag. Code signing remains PRODUCT-undecided — SmartScreen is accepted for internal.

## Research Methodology

- Sources consulted: 22 (repo files, `gh` live API, 3 external doc sets)
- Date range: 2025-12 – 2026-08-27 (electron-builder signing current docs; TS 5.x `allowImportingTsExtensions`; repo 2026-08-26/27)
- Key search terms: unsigned NSIS SmartScreen, `allowImportingTsExtensions` + `noEmit`, GitHub `workflow_run` artifacts, `v1.0.10` release assets
- Recency: live `gh release view v1.0.10` + `npm run compile` 2026-08-27; brainstorm 2026-08-26 is **stale**

**Primary evidence (this machine):**

| Source | Role |
|--------|------|
| `package.json` `1.0.10` | version contract |
| `.github/workflows/{ci,release-desktop,desktop-pack-preview}.yml` | gates |
| `desktop/electron-builder.yml` | unsigned NSIS |
| `plans/reports/test-260826-win-smoke-110.md` | smoke sign-off |
| `scripts/{check-win-smoke-signoff,release-v1.0.10-gate}.sh` | tag gate |
| `npm run compile` 2026-08-27 | 33 errors |
| `gh release view v1.0.10` | assets + sizes |
| `git ls-remote --tags origin` | `v1.0.10` = `0902461` annotated → `86b485a` |

## Key Findings

### 1. Technology Overview

Desktop is a thin Electron 37 shell around a bundled Playwright CLI (`desktop:prepare-pack` → `dist-cli` + `desktop/main.bundle.cjs` → electron-builder). Customers need **Google Chrome** on the machine; Playwright browsers are skipped (`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`). Pack is CI-only on Linux hosts (wine ENOENT).

```text
push main/PR
  └─ CI: npm test + xvfb e2e (Linux only)     ← no tsc

CI green on main
  └─ Desktop Pack Preview: NSIS + AppImage artifacts (14d)

human: Win smoke checklist → - Result: PASS
  └─ release-v1.0.10-gate.sh → git push origin v1.0.10
       └─ Release Desktop: e2e linux+windows → pack →
            if tag==v1.0.10: check-win-smoke-signoff.sh →
            GitHub Release
```

`compile` is a local script only. Release does not typecheck.

### 2. Current State — four waves

#### Wave A — 1.0.10 polish

**Shipped in tag `v1.0.10` (commit `86b485a`):**

- Selected-job `openCsv` / `openOutDir` via `requestedOutDir` (`desktop/main.ts`)
- Browse other jobs while scan runs; Start/Resume re-read `#out`; idle no snap-back
- Version bump + README / `docs/desktop-windows.md`
- CI workflow + pack-preview (post-brainstorm cook)
- Smoke gate tests (`test/release-gate.test.ts`) skip on Windows runners (needed: first tag-push release **failed** windows e2e job `32927164813`, retry `32927255797` success)

**Not in 1.0.10 (working tree only — dirty vs `origin/main`):**

| File | Extra vs released 1.0.10 |
|------|--------------------------|
| `desktop/types.ts`, `build-scan-argv.ts`, `main.ts` | `probeParallel` → `--probe-parallel` |
| `desktop/renderer/index.html`, `app.js` | checkbox “Quét đường dẫn song song” |
| `package.json` | Track S scripts (`test:track-s`, `track-s:*`) |
| `cli/`, `lib/path-probe.ts` | Track S engine (uncommitted) |

**Do not fold Track S into a 1.0.10 rebuild.** Polish wave for *this* version is closed. Probe-parallel GUI is **1.0.11** and currently sits on a contaminated A/B (`plans/reports/check-track-s-rerun.md`: keepAlive shared-tab at concurrency 2).

Plan drift: `plans/260826-0909-next-deployment-scope/phase-01-desktop-110-ship.md` still unchecked “tag not pushed” / “smoke unsigned”. False.

#### Wave B — Customer smoke

Checklist `plans/reports/test-260826-win-smoke-110.md`:

- Frontmatter `status: pass-delegated-automated`
- Exact line `- Result: PASS` → `check-win-smoke-signoff.sh` exits 0
- Body admits: **HITL steps 1–10 not run**; Chrome on operator VM **unchecked**
- Proxy evidence: CI unit+Linux e2e run 32926837417; NSIS preview 32926881522 (~91 MB)

Gate script `release-v1.0.10-gate.sh` only greps that one line + `package.json` version + local tests. It **cannot** distinguish HITL from a paper PASS.

Live customer signal: GitHub asset `downloadCount` = **0** for NSIS, AppImage, deb, blockmap. Nobody outside CI has fetched the installer.

What Linux e2e actually covers (`test/desktop-electron.e2e.test.ts`): Vietnamese shell, empty-query block, keyword, hide-chrome default, job table selection, Job mới, browse-while-running, IPC openCsv/openOutDir. **Does not:** install NSIS, Start→Stop→Resume a real Trustpilot scan, open CSV in Excel, SmartScreen, Windows Chrome profile, Cloudflare once.

**Verdict:** RT-1 (“smoke before tag”) was **satisfied as process, vacated as HITL**. Fine for internal. Not a customer-ready claim.

#### Wave C — Release blockers

**For 1.0.10 itself: none remaining.** Release exists, docs match, CI green.

**Blockers for the next customer binary (1.0.11 / Track S desktop):**

| ID | Sev | Blocker | Evidence |
|----|-----|---------|----------|
| R1 | P0 | Working tree ≠ `v1.0.10` | 14 modified + 42 untracked; Track S + probe-parallel |
| R2 | P0 | Compile red and ungated | `tsc --noEmit` exit 2; `ci.yml` has no compile step |
| R3 | P1 | HITL smoke never executed | checklist notes; downloadCount 0 |
| R4 | P1 | Plan/docs still say “tag pending” | phase-01, plan.md success criteria, audit-260826 |
| R5 | P2 | Unsigned NSIS | `electron-builder.yml` `signAndEditExecutable: false`; PRODUCT undecided |
| R6 | P2 | `cli/` not in `tsconfig` | compile cannot catch scan/browser regressions |
| R7 | P3 | RT-6 symlink out-path | deferred in plan 260826; still open |
| R8 | P3 | First tag-push release failed Windows e2e | run 32927164813; later skip bash-gate tests on win32 |

**Not blockers:** wine on Linux (CI packs). Track A A/B (deferred). Code signing (explicit non-goal unless user promotes).

#### Wave D — Compile debt

**Command:** `npm run compile` → `tsc --noEmit`. **2026-08-27: 33 errors, exit 2.**

Earlier Track S check reported **35** (included 2× TS7006 in `test/track-s-compare.test.ts`). Those two are gone in the current WT. Remaining 33 are almost all **pre-existing desktop/lib/test**.

| n | Code | Where | Fix class |
|--:|------|--------|-----------|
| 16 | TS5097 | `.ts` imports in `desktop/*`, `lib/config.ts:124`, `scripts/merge-shards.ts`, 2 tests | config: `allowImportingTsExtensions` (WXT already `noEmit` + `moduleResolution: Bundler`) |
| 10 | TS2339 / TS2531 / TS18048 | `test/desktop-electron.e2e.test.ts` (`window.affiliateDesktop`, null DOM, `win`) | test types / `!` / `HTMLInputElement` |
| 4 | TS2353 | `test/early-exit.test.ts` `totalLinks` not on `EarlyExitSignal` | drop field or extend type |
| 2 | TS2741 / TS2739 | `test/desktop-adapter.test.ts` `Evidence` / `LinkHit` fixtures | add `junkBaselineStatus`, `platform`, `isStrong` |
| 1 | TS18047 | `lib/trustpilot-reader.ts:39` `el` possibly null | null guard |

`cli/` is in `tsconfig.json` **exclude**. Compile will never see `cli/scan.ts` / `cli/browser.ts`. That is how keepAlive tab-share survived typecheck.

CI (`ci.yml`) runs `npm test` + xvfb e2e only. Vitest transpiles; it does not enforce `tsc`. **Compile debt cannot block a release today.**

Official TS: `allowImportingTsExtensions` is legal iff `noEmit` or `emitDeclarationOnly`. This repo already has `noEmit` via `.wxt/tsconfig.json`. One-line config would clear **16/33**. Remaining 17 are real type holes, mostly tests.

### 3. Best Practices vs this repo

| Practice | Source | This repo |
|----------|--------|-----------|
| Sign Windows exe + NSIS; OV reputation grows, EV immediate | [electron-builder Windows signing](https://www.electron.build/docs/features/code-signing/code-signing-win/) | Explicitly unsigned (`signAndEditExecutable: false`). Docs tell users “More info → Run anyway”. Matches PRODUCT “undecided”. |
| `allowImportingTsExtensions` + `noEmit` when bundler resolves `.ts` | [TS handbook](https://www.typescriptlang.org/tsconfig/allowImportingTsExtensions.html) | Imports use `.ts`; flag **off** → TS5097 flood |
| CI typecheck on every push | common TS/Electron | **Missing** |
| Human smoke on target OS before first customer tag | plan RT-1 | Paper PASS |
| Preview artifacts before tag | GitHub `upload-artifact` | Pack Preview works; 14-day retention |
| Don’t ship dirty WT as same version | RT-8 | 1.0.10 clean on origin; WT dirty — keep it that way |

### 4. Security Considerations

- Unsigned installer: SmartScreen “unknown publisher”. Expected. Do not claim “customer-ready Windows” without a cert or a real HITL note.
- `after-pack.cjs` copies `dist-cli/node_modules` with `verbatimSymlinks: true` — pack integrity depends on `prepare-desktop-pack` having run; hook throws if missing. Good.
- Preview workflow `permissions: contents: read` is correct for artifact-only. Release needs `contents: write` (has it).
- RT-6 symlink escape on non-existent out paths: still deferred. Not a 1.0.10 regression.
- Ethics floor (blocked ≠ none, concurrency ≤ 3, no CF bypass) is product, not installer. Unrelated to NSIS.

### 5. Performance Insights

- NSIS ~91–95 MB: Playwright runtime + Electron. Preview 95388224 B vs Release 95313021 B — same ballpark; don’t treat byte delta as a pack bug without a content diff.
- AppImage 120 MB / deb 94 MB — Linux is optional customer surface.
- Pack Preview after every green CI on `main` costs Windows + Ubuntu runners. Fine at current merge rate; cancel-in-progress is on.
- Compile is cheap (~4s here). Adding it to CI is the highest leverage quality gate still missing.

## Comparative Analysis

| Approach | 1.0.10 now | Next (1.0.11) |
|----------|------------|----------------|
| Retag / rebuild 1.0.10 | **No.** Assets exist; docs match. | N/A |
| Real Win VM HITL on 1.0.10 NSIS | Optional integrity; does not unblock a missing release | Required if probe-parallel ships in GUI |
| Enable `allowImportingTsExtensions` | Does not change 1.0.10 binary | Do before next tag |
| Add `compile` to `ci.yml` | Would fail `main` today | Fix 33 errors first, then gate |
| Typecheck `cli/` | Out of 1.0.10 scope | Separate `tsconfig.cli.json` (tsx/esbuild) |
| Code signing | PRODUCT non-goal | Only if user promotes |

Brainstorm 260826-ci-and-release-gap **Approach A (ci.yml)** — **done**.  
**Approach C (pack preview)** — **done** (was “wave 2 optional”).  
Release Approach A (smoke → gate → tag) — **executed with delegated PASS**.

## Implementation Recommendations

### Quick Start Guide (do this, in order)

1. **Close 1.0.10 on paper.** Update phase-01 + plan success criteria + `audit-260826` to: tagged `v1.0.10`, Release assets >50 MB, smoke = delegated PASS / HITL unpaid.
2. **Do not `git push` Track S on `1.0.10`.** Branch `feat/track-s` (or similar). Probe-parallel GUI rides that branch.
3. **Compile debt, two commits:**
   - `tsconfig.json`: `"allowImportingTsExtensions": true` (already `noEmit` via WXT).
   - Fixture/e2e/`trustpilot-reader` type holes (17 errors).
4. **Add `npm run compile` to CI `test` job** only after step 3 is green locally.
5. **Optional HITL:** install Release NSIS on a Win 10/11 VM with Chrome; Start → Stop → Resume → Mở CSV on **selected** job. Append a second sign-off block; do not rewrite history of the delegated PASS.
6. **1.0.11 tag** only after Track S isolation is real (no shared keepAlive page at concurrency 2) and compile is CI-green.

### Code Examples

```jsonc
// tsconfig.json — add only this; WXT already sets noEmit + Bundler
{
  "extends": "./.wxt/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "allowImportingTsExtensions": true,
    "types": ["chrome", "vitest/globals"]
  },
  "include": ["**/*.ts", "**/*.tsx", ".wxt/**/*"],
  "exclude": ["node_modules", ".output", "cli"]
}
```

```yaml
# .github/workflows/ci.yml — after npm ci, before unit tests
- name: Typecheck
  run: npm run compile
```

Do **not** enable this YAML until `tsc` is exit 0.

### Common Pitfalls

- Treating brainstorm-260826-ci-and-release-gap as current — CI and tag already landed.
- Treating `- Result: PASS` as HITL — script is a string match.
- Enabling `allowImportingTsExtensions` **without** `noEmit` — TS forbids it. Safe here because WXT sets `noEmit`.
- Typechecking `cli/` with the WXT/bundler config — CLI runs under `tsx`; needs its own project or it will fight extensions.
- Shipping probe-parallel checkbox while A/B isolation is still shared-tab — customer would get cross-domain verdicts.

## Resources & References

### Official Documentation

- [TypeScript `allowImportingTsExtensions`](https://www.typescriptlang.org/tsconfig/allowImportingTsExtensions.html)
- [electron-builder Windows code signing](https://www.electron.build/docs/features/code-signing/code-signing-win/)
- [GitHub Release v1.0.10](https://github.com/manhquydev/affiliate-partner-finder/releases/tag/v1.0.10)
- [CI run (docs push)](https://github.com/manhquydev/affiliate-partner-finder/actions/runs/32927541764)
- [Release Desktop success](https://github.com/manhquydev/affiliate-partner-finder/actions/runs/32927255797)

### Repo contracts

- `docs/desktop-windows.md` — customer download + pipeline table
- `PRODUCT.md` — unsigned / no English / no in-app results
- `scripts/release-v1.0.10-gate.sh` — post-smoke tag helper
- `plans/reports/brainstorm-260826-ci-and-release-gap.md` — **historical**; outcome landed

### Further Reading

- `plans/reports/check-track-s-rerun.md` — why next desktop flag is not shippable yet
- `plans/260826-0909-next-deployment-scope/` — update checkboxes; don’t re-execute Wave 1

## Appendices

### A. Glossary

| Term | Meaning here |
|------|----------------|
| HITL | Human-in-the-loop Win VM checklist |
| Paper PASS | `- Result: PASS` without steps 1–10 executed |
| Pack Preview | GitHub Actions artifacts, not a GitHub Release |
| Compile debt | `tsc --noEmit` red; Vitest still green |

### B. Version Compatibility Matrix

| Channel | Version | NSIS | Notes |
|---------|---------|------|-------|
| GitHub Latest | v1.0.10 | 95.3 MB | unsigned |
| `package.json` on `main` | 1.0.10 | — | matches tag |
| Working tree | 1.0.10 + Track S diff | — | **do not pack as 1.0.10** |
| Previous Latest (pre-tag) | v1.0.9 | — | superseded |

### C. Raw Research Notes

- `gh run list` 2026-08-27: latest CI success on `8e50bed`; Pack Preview success after that push.
- Failed release 32927164813: `test-e2e (windows-latest)` failed; linux e2e success; build/release skipped. Follow-up commit `86b485a` skips bash gate tests on win32.
- `npm run compile` wall ~3.8s, 33 diagnostics, no `track-s-compare` in the set.
- Asset downloadCount all 0 as of this research.

## Next steps (ranked)

1. Patch plan/audit checkboxes so agents stop “waiting for a tag”.
2. Keep Track S off `main` until isolation + compile.
3. One-line `allowImportingTsExtensions`; then 17 real type fixes; then CI compile.
4. Optional: HITL 1.0.10 NSIS once, as a **new** note, not a rewrite of the delegated PASS.
5. 1.0.11 only after (2)+(3). Signing still wait-for-user.

## Unresolved Questions

- Who, if anyone, will run HITL on a real Win VM, and is that required before **any** future tag or only before 1.0.11?
- Promote code signing (OV in CI vs EV/HSM vs stay unsigned)? PRODUCT still undecided.
- Should `cli/` get a second tsconfig, or stay excluded forever?
- Is Pack Preview-on-every-main-CI worth the Windows runner cost once Track S lands?
- First Windows e2e failure on tag push: flake vs bash-gate? Commit message implies gate tests; logs not re-opened here.
