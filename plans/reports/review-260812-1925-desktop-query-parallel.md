# Parallel review + test — desktop custom keyword (2026-08-12 19:25 +07)

## Agents (4 parallel scopes)

| Agent | Scope | Verdict (pre-fix) |
|-------|-------|-------------------|
| code-reviewer | IPC/backend (`main.ts`, `preload`) | **FAIL** — symlink read escape, resume semantics |
| code-reviewer | Renderer/UI (`app.js`, HTML, CSS) | **FAIL** — boot sync, readonly affordance |
| tester | Happy path | **PASS** 91/91 → 95/95 after edge tests |
| tester | Edge cases | Mixed — 4 new unit tests added |

## Test results (post-fix)

```
npm test → 95/95 passed (12 files)
```

Reports:
- `plans/reports/test-260812-1925-desktop-query-happy.md`
- `plans/reports/test-260812-1925-desktop-query-edge.md`

## Fixes applied after review

### IPC (`desktop/main.ts`)
- `resolveSafeOutDir()` — validate input + `realpath` + block escape (mirror `open-out`)
- `inspect-out` returns `canResume` (`companies.json` exists)
- `desktop:start` uses same safe out resolution

### Renderer (`app.js`)
- Boot: sync query from out dir after defaults; fallback localStorage
- Start/Resume: sync before spawn; don't clobber draft keyword unless `canResume` or `force`
- `read-only` styling + `aria-readonly`

## Remaining gaps

- No Electron E2E for renderer DOM
- `npm run compile` still has pre-existing TS5097 errors (unrelated)
- Windows native path smoke on VM recommended

## Merge recommendation

**PASS (conditional)** — critical IPC + UX issues addressed; 95 unit tests green.
