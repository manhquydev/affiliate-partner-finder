---
type: code-reviewer
date: 2026-09-01
lens: Assumption Destroyer
---

# Red team: Assumptions

## Finding 1: Help text test does not prove scan is skipped
- **Severity:** High
- **Location:** Phase 2, tests
- **Flaw:** `parseArgs` is not exported. A `--help` assertion cannot fail if collect-only still calls `launchScanSession`.
- **Evidence:** `cli/index.ts:79` `function parseArgs` (unexported); `cli/index.ts:341` `launchScanSession` after collect with no collectOnly flag today.
- **Suggested fix:** extract `afterCollectAction` (or equivalent) and unit-test outcomes: scan vs exit 0 vs exit 130 vs exit 1.

## Finding 2: domainToUrl unexported is real but cheap
- **Severity:** Medium
- **Location:** Phase 1
- **Flaw:** Plan assumes export is a one-liner. True; no other callers. Not load-bearing failure.
- **Evidence:** `lib/resolve.ts:16` `function domainToUrl` unexported; `export async function resolve` at `:25`.
- **Suggested fix:** still export; no extra abstraction.

## Finding 3: Company.name already falls back
- **Severity:** Medium
- **Location:** Phase 1, name fallback
- **Flaw:** Double fallback is fine; plan should not claim Collect omits names.
- **Evidence:** `cli/collect.ts:104` `name: u.name || domain`
- **Suggested fix:** keep CSV fallback; note Collect already fills name.

## Finding 4: IPC whitelist hole already recorded
- **Severity:** Critical if missed
- **Location:** Phase 3
- **Flaw:** `desktop:start` does not spread opts. Supervisor WOULD forward collectOnly via `{...opts}` IF main passed it.
- **Evidence:** `desktop/main.ts:228-266` explicit fields, no collectOnly; `desktop/job-supervisor.ts:103` `buildScanArgv({ ...opts, out, profile })`; `desktop/preload.cjs:6` forwards whole opts.
- **Suggested fix:** already in phase 3 after pre-red-team edit. Do not regress.

Status: DONE
