# Desktop GUI (Windows-first)

Thin Electron shell around the existing Playwright CLI. Does **not** rewrite the scan engine.

## Contract

- Spawn CLI with argv arrays (`desktop/build-scan-argv.ts`)
- Watch `progress.json` + `results.jsonl` for live status
- Rolling ETA on the dashboard (`desktop/eta.ts`): blends recent/medium/session rates, seeds from `results.jsonl` on resume, hides ETA when stalled >8 minutes
- Opt-in Track A flags in the UI (default **unchecked**): `--network-evidence`, `--lazy-settle`, plus `--early-exit` — wired through IPC → `buildScanArgv`
- End-user columns via `lib/export.ts` `simpleHit` / `toSimpleCSV`
- Profile/out paths must stay under app-owned roots (never Chrome User Data)
- Dev: `npm run desktop:dev` (requires `electron`)
- Linux overnight CLI jobs use separate `--out` / `--profile` — do not share with desktop smoke

See `docs/desktop-windows.md` and plan `plans/260812-0939-windows-desktop-gui-electron-shell/`.
