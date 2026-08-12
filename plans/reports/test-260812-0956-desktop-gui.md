# Test report — Windows desktop GUI adapter

**Date:** 2026-08-12 09:56  
**Plan:** `plans/260812-0939-windows-desktop-gui-electron-shell/`  
**Suite:** `npm test` → **89/89 passed** (includes 12 `desktop-adapter` tests)

## Covered

- delay/concurrency clamps, win32 argv (no virtual-display, profile required)
- path safety rejects Chrome User Data / out escape
- progress read, canStartFresh
- jsonl counts with truncated line skip + domain dedupe
- CSV-from-jsonl simple columns
- CLI soft-stop: early SIGINT/SIGTERM + `.stop` file poll; export CSV on stop
- Supervisor: ELECTRON_RUN_AS_NODE, await stop, CSV only if missing after exit

## Not automated (manual gates)

- `npm run desktop:dev` GUI smoke (Linux needs `--no-sandbox` in script)
- Windows NSIS install + Start/Stop/Resume/CSV (blocking for “customer ready”)
- Packaged playwright tree under extraResources (documented gap — pack = internal until filled)

## 10k ops

`design-full-10k` left running (~591/7465 at verify); desktop uses separate profile/out roots.
