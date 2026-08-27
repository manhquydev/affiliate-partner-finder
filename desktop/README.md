# Desktop GUI (Windows-first)

Thin Electron shell around the existing Playwright CLI. Does **not** rewrite the scan engine.

## Contract

- Spawn CLI with argv arrays (`desktop/build-scan-argv.ts`)
- Watch `progress.json` + `results.jsonl` for live status
- Rolling ETA on the dashboard (`desktop/eta.ts`): blends recent/medium/session rates, seeds from `results.jsonl` on resume, hides ETA when stalled >8 minutes
- Opt-in Track A flags in the UI (default **unchecked**): `--network-evidence`, `--lazy-settle`, `--early-exit`, **`--probe-parallel`** (v1.0.11) — wired through IPC → `buildScanArgv`
- End-user columns via `lib/export.ts` `simpleHit` / `toSimpleCSV`
- Profile/out paths must stay under app-owned roots (never Chrome User Data)
- Renderer (`desktop/renderer/`): job table + selected-job preview. Start/Resume read `#out` (the selected folder), not the last supervisor job unless it is still selected. While a scan runs the table stays selectable; Start/Resume stay locked (one Chrome profile). Stop always stops the live scan. Open CSV / folder use the selected job path.
- Dev: `npm run desktop:dev` (requires `electron`)
- Linux overnight CLI jobs use separate `--out` / `--profile` — do not share with desktop smoke

See `docs/desktop-windows.md` and plan `plans/260812-0939-windows-desktop-gui-electron-shell/`.
