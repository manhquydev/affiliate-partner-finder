# Test report — Desktop custom keyword (happy path)

**Date:** 2026-08-12 19:25  
**Scope:** Happy path — custom Trustpilot query → CLI adapter (parallel/independent)  
**Repo:** `/home/manhquy/Downloads/affiliate-partner-finder`

## Commands run

| # | Command | Exit | Result |
|---|---------|------|--------|
| 1 | `npm test` | 0 | **91/91 passed** (12 files) |
| 2 | `npm run compile` (`tsc --noEmit`) | 2 | **FAIL** — pre-existing TS5097/TS2741 in desktop imports + test fixtures |
| 3 | `npx vitest run test/desktop-adapter.test.ts -t buildScanArgv` | 0 | **2/2 passed** (12 skipped in file) |
| 4 | `npx tsx -e "buildScanArgv({ query: 'hosting', ... })"` | 0 | `--query hosting` confirmed at runtime |

**Test duration:** 1.66s (full suite)

## Test results overview

```
Test Files  12 passed (12)
     Tests  91 passed (91)
  Duration  1.66s
```

- **Passed:** 91  
- **Failed:** 0  
- **Skipped:** 0  

`desktop-adapter.test.ts`: **14/14 passed** (includes resume-omits-query, progress read, argv clamps).

## Happy-path verification

### 1. User enters custom query → startJob sends query to CLI

**Evidence chain (code):**

```80:94:desktop/renderer/app.js
  $('btnStart').onclick = async () => {
    const query = $('query').value.trim();
    // ...
    await api.startJob({
      query,
      limit: Number($('limit').value),
      out: $('out').value,
      resume: false,
    });
```

```136:156:desktop/main.ts
ipcMain.handle('desktop:start', async (_e, opts: { query?: string; ... }) => {
  // ...
  await supervisor.start({
    query: opts.query,
    // ...
  });
```

```61:80:desktop/job-supervisor.ts
    const argv = buildScanArgv({ ...opts, out, profile });
    // ...
    this.child = spawn(launcher.command, [...launcher.prefixArgs, ...argv], {
```

**Runtime check:** `buildScanArgv({ query: 'hosting', ... })` → `['--out', ..., '--query', 'hosting', ...]`

**Status:** ✅ Verified (code + runtime; no E2E GUI test)

---

### 2. buildScanArgv includes `--query` when not resume

**Implementation:**

```31:38:desktop/build-scan-argv.ts
  if (opts.resume) {
    args.push('--resume');
  } else {
    if (!opts.query?.trim()) {
      throw new Error('query is required when not resuming');
    }
    args.push('--query', opts.query.trim());
```

**Test coverage:**

```88:97:test/desktop-adapter.test.ts
  it('resume omits query requirement', () => {
    const args = buildScanArgv({
      resume: true,
      out: '/tmp/out1',
      profile: '/tmp/profile1',
      platform: 'linux',
    });
    expect(args).toContain('--resume');
    expect(args).not.toContain('--query');
  });
```

**Gap:** `buildScanArgv includes scan-profile and clamps` passes `query: 'design'` but does **not** assert `args` contains `--query` / value. Negative resume case covered; positive `--query` assertion missing in unit tests.

**Status:** ✅ Behavior correct; ⚠️ add explicit `expect(args).toContain('--query')` + value assert for custom keyword

---

### 3. Default UI no longer hardcodes `value="design"`

**Desktop renderer:**

```17:19:desktop/renderer/index.html
        Từ khoá Trustpilot
        <input id="query" type="text" placeholder="vd: hosting, vpn, marketing…" autocomplete="off" />
        <span class="hint">Tìm công ty trên Trustpilot theo từ khoá bạn nhập — không cố định “design”.</span>
```

- No `value="design"` on desktop query input  
- `app.js` loads last query from `localStorage` (`apf-last-query`) on boot  

**Note:** Extension popup/options still default `value="design"` — out of desktop scope.

**Status:** ✅ Verified

---

### 4. inspectOutDir returns progress.query for existing job dir

**IPC handler:**

```117:131:desktop/main.ts
ipcMain.handle('desktop:inspect-out', (_e, outPath: string) => {
  // ...
  const progress = readProgress(out);
  return {
    progress,
    canStartFresh: canStartFresh(out),
    query: progress?.query ?? '',
    total: progress?.total ?? null,
  };
});
```

**Renderer consumer:**

```55:63:desktop/renderer/app.js
async function syncFromOutDir() {
  const out = $('out').value.trim();
  if (!out || !api?.inspectOutDir) return;
  try {
    const info = await api.inspectOutDir(out);
    if (info?.query) setQueryInput(info.query);
```

**Unit test:** `readProgress and canStartFresh` writes `progress.json` with `query: 'design'` and asserts `readProgress(dir)?.completed === 3` (query field preserved in parse).

**Status:** ✅ Verified (code + readProgress test; no dedicated inspectOutDir IPC test)

## Coverage metrics

No coverage run requested. Mapped happy-path surfaces:

| Surface | Unit test | E2E |
|---------|-----------|-----|
| buildScanArgv --query (fresh) | partial | — |
| buildScanArgv resume (no --query) | ✅ | — |
| readProgress.query | ✅ | — |
| inspectOutDir IPC | — | — |
| renderer startJob query pass-through | — | — |
| UI no hardcoded design | — | manual |

## Build status

`npm run compile` **failed** (not blocking vitest):

- `TS5097`: `.ts` extension imports in `desktop/*.ts`, `scripts/merge-shards.ts` (esbuild/tsx path OK at runtime)
- `TS2741`/`TS2739`: test fixture `ScanResult`/`Evidence` types in `desktop-adapter.test.ts`

Vitest transpiles without full `tsc` — tests green; CI typecheck may fail if compile gate enforced.

## Performance

Full suite **1.66s** — no slow tests flagged. `desktop-adapter` file: 112ms.

## Critical issues

None for happy-path behavior. Tests pass; wiring confirmed.

## Recommendations

1. **Add unit test** — `buildScanArgv` with `query: 'hosting'` → `expect(args).toEqual(expect.arrayContaining(['--query', 'hosting']))`.
2. **Add unit test** — mock `readProgress` return + assert `inspect-out` handler shape `{ query, progress, canStartFresh }` (or export handler logic for test).
3. **Fix compile** — align tsconfig/import paths or relax test fixture types so `npm run compile` passes.
4. **Manual smoke** (optional): `npm run desktop:dev` → enter "hosting" → confirm CLI argv in logs / `progress.json` query field.

## Next steps (priority)

1. Positive `--query` assertion in `desktop-adapter.test.ts`  
2. Resolve `tsc --noEmit` errors for desktop module  
3. Manual desktop:dev smoke with non-"design" keyword  

## Unresolved questions

- Should extension popup/options also drop hardcoded `value="design"` for consistency?
- Is `npm run compile` a required CI gate, or vitest-only?
