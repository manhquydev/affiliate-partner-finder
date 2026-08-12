# Test report — Desktop keyword edge cases

**Date:** 2026-08-12 19:25  
**Scope:** Edge-case validation for desktop keyword feature (parallel, independent)  
**Repo:** `/home/manhquy/Downloads/affiliate-partner-finder`  
**Command:** `npm test` → **95/95 passed** (18 desktop-adapter, +4 new)

## Diff-aware mode

Analyzed 9 changed files (desktop keyword work). Mapped tests via Strategy C (import graph) → `test/desktop-adapter.test.ts`. Renderer-only paths have no co-located tests; validated by code trace.

| Changed (sample) | Mapped tests |
|------------------|--------------|
| `desktop/main.ts`, `desktop/renderer/app.js` | `test/desktop-adapter.test.ts` (adapter layer) |
| `desktop/build-scan-argv.ts`, `desktop/progress.ts` | same |

Ran **95/95** (full suite — config unchanged, diff small but renderer gaps need full green).

---

## Edge case matrix

### 1. Empty/whitespace query on Start → UI blocks, no CLI spawn

| Status | **PASS** (manual trace) / **UNTESTED** (automation) |
|--------|-----------------------------------------------------|

**Evidence (renderer):**

```80:86:desktop/renderer/app.js
  $('btnStart').onclick = async () => {
    const query = $('query').value.trim();
    if (!query) {
      $('message').textContent = 'Nhập từ khoá Trustpilot trước khi bắt đầu.';
      $('query').focus();
      return;
    }
```

Early `return` before `api.startJob()` — no IPC, no spawn.

**Backend defense (added test):** `buildScanArgv` throws `query is required when not resuming` for `''`, `'   \t'`, `undefined`.

**Gap:** No DOM/Electron renderer test harness. Whitespace-only input blocked in UI; backend would also throw if IPC bypassed.

**Recommendation:** Optional — extract `validateStartQuery(q)` pure fn + unit test; low priority since UI + `buildScanArgv` both guard.

---

### 2. Resume without query arg → buildScanArgv omits `--query`

| Status | **PASS** |
|--------|----------|

**Evidence:** `test/desktop-adapter.test.ts` — `resume omits query requirement` (pre-existing).

```31:38:desktop/build-scan-argv.ts
  if (opts.resume) {
    args.push('--resume');
  } else {
    if (!opts.query?.trim()) {
      throw new Error('query is required when not resuming');
    }
    args.push('--query', opts.query.trim());
```

Renderer Resume calls `api.startJob({ out, resume: true })` with no `query` — correct.

---

### 3. inspect-out with invalid/escape out path → assertSafeJobPaths throws

| Status | **PASS** |
|--------|----------|

**Evidence:**

- Pre-existing: `assertSafeJobPaths enforces out root` (`/tmp/evil` outside allowed root).
- Pre-existing: rejects Chrome User Data profile.
- **Added:** `assertSafeJobPaths rejects path traversal escape via ..`.

```117:124:desktop/main.ts
ipcMain.handle('desktop:inspect-out', (_e, outPath: string) => {
  const out = resolve(outPath);
  assertSafeJobPaths({
    out,
    profile: profileRoot,
    allowedOutRoot: runsRoot,
```

IPC handler has no try/catch — rejection propagates to renderer; `syncFromOutDir` swallows errors (acceptable UX).

**Gap:** Non-absolute relative paths throw `out and profile must be absolute paths` — not explicitly tested (minor).

---

### 4. Out dir without progress.json → inspect returns empty query

| Status | **PASS** |
|--------|----------|

**Evidence:**

```125:131:desktop/main.ts
  const progress = readProgress(out);
  return {
    progress,
    canStartFresh: canStartFresh(out),
    query: progress?.query ?? '',
    total: progress?.total ?? null,
  };
```

- Pre-existing: `readProgress` returns `null` when file missing.
- **Added:** `inspect-out returns empty query when progress.json missing` — mirrors handler mapping.

Renderer `syncFromOutDir` only updates input when `info?.query` truthy — empty string preserves user-typed keyword (correct).

---

### 5. Query field readonly during running job

| Status | **PASS** (manual trace) / **UNTESTED** (automation) |
|--------|-----------------------------------------------------|

**Evidence:**

```27:43:desktop/renderer/app.js
function renderStatus(s) {
  ...
  const running = s.state === 'running' || s.state === 'stopping';
  ...
  if (jobQuery && running) setQueryInput(jobQuery, { readonly: true });
  else if (!running) {
    $('query').readOnly = false;
    if (jobQuery && !$('query').value.trim()) $('query').value = jobQuery;
  }
```

`setQueryInput` sets `el.readOnly = readonly`; input stays enabled (`disabled = false`) so text visible/copyable.

**Gap:** Requires Electron renderer test or manual GUI smoke.

**Recommendation:** Manual gate in `npm run desktop:dev`: start job → confirm query input read-only until idle.

---

### 6. localStorage empty on first boot

| Status | **PASS** (manual trace) / **UNTESTED** (automation) |
|--------|-----------------------------------------------------|

**Evidence:**

```16:18:desktop/renderer/app.js
function loadLastQuery() {
  return localStorage.getItem(STORAGE_KEY) || '';
}
```

```71:71:desktop/renderer/app.js
  setQueryInput(loadLastQuery());
```

Missing key → `''` → empty input, no throw. `saveLastQuery` only writes when trimmed non-empty.

**Gap:** No jsdom/localStorage test.

**Recommendation:** Low priority; behavior trivial. Optional jsdom test if renderer test harness added later.

---

### 7. Windows path handling in inspect-out

| Status | **PASS** (partial — CI on Linux) / **UNTESTED** (Windows VM) |
|--------|--------------------------------------------------------------|

**Evidence:**

- `resolve(outPath)` in main normalizes on host OS.
- `isPathInside` uses `sep` + `resolve` — correct on win32 when paths are native.
- Pre-existing: `win32 always has profile` uses `C:\Users\...\runs\r1` in argv test.
- Pre-existing: `defaultDesktopProfileDir uses LOCALAPPDATA on win32`.
- **Added:** `defaultDesktopRunsDir uses Documents on win32`.

**Linux CI limitation:** `D:/Users/...` style paths resolve under cwd on Linux — not representative of Windows runtime. Real win32 `inspect-out` with backslashes needs Windows VM/manual gate.

**Recommendation:** Add Windows smoke: inspect-out on `Documents\AffiliatePartnerFinder\runs\<job>` with mixed `\`/` slashes.

---

## Test results overview

| Metric | Value |
|--------|-------|
| Total tests | 95 |
| Passed | 95 |
| Failed | 0 |
| Skipped | 0 |
| desktop-adapter | 18 (+4 new) |
| Duration | ~1.0s |

## Coverage metrics

No `test:coverage` script in `package.json`. Adapter modules (`build-scan-argv`, `progress`, `job-lock`, `ket-qua-counts`, `format`) covered by unit tests. **Uncovered:** `desktop/main.ts` IPC wiring, `desktop/renderer/app.js`, `desktop/job-supervisor.ts` spawn lifecycle.

## Build status

`npm test` (vitest run) — **SUCCESS**, no warnings beyond npm/Node version notice.

## Critical issues

None blocking. All automatable backend edge cases pass.

## Recommendations (prioritized)

1. **Windows VM smoke** — inspect-out + Start/Resume with native backslash paths (edge 7).
2. **Manual GUI gate** — empty query block + readonly while running (edges 1, 5).
3. **Optional:** Export `inspectOutDir()` pure helper from main logic for tighter IPC unit test (edge 4 already mirrored).
4. **Optional:** Renderer test harness (jsdom + mocked `window.affiliateDesktop`) for localStorage/readonly/start guard.

## Tests added

File: `test/desktop-adapter.test.ts`

- `buildScanArgv rejects empty or whitespace query when not resuming`
- `inspect-out returns empty query when progress.json missing`
- `assertSafeJobPaths rejects path traversal escape via ..`
- `defaultDesktopRunsDir uses Documents on win32`

## Unresolved questions

- Should `syncFromOutDir` surface path-escape errors to `#message` instead of silent catch? (UX, not functional bug)
- Is Windows packaged smoke scheduled in CI or release checklist only?
