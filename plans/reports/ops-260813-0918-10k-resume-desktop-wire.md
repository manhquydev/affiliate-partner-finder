# Ops — 10k resume + desktop Track A wiring (2026-08-13 09:18)

## 10k job

| Signal | Before | After |
|--------|--------|-------|
| CLI procs | **0** (dead ~16–18m) | **alive** (3 shards × resume) |
| Progress | stuck ~1016/1008/1014 | moved **1024/1013/1021** |
| Flags | — | `--early-exit` only; **no** `--network-evidence` / `--lazy-settle` |
| Monitor | dead | `shard-monitor-loop` restarted (120s) |

Relaunch: `npm run shard:relaunch -- --manifest out/design-full-10k-shards/shard-manifest.json --concurrency 3 --delay-ms 1000 --early-exit --accept-failures`

## CLI vs desktop coverage (Track A + ETA)

| Feature | CLI | Desktop before | Desktop after |
|---------|-----|----------------|---------------|
| `--network-evidence` | ✅ flag | argv helper only; IPC/UI missing | ✅ checkbox → IPC → argv (default OFF) |
| `--lazy-settle` | ✅ flag | argv helper only | ✅ checkbox → IPC → argv (default OFF) |
| `--early-exit` | ✅ | type only; not in UI | ✅ checkbox |
| early-exit × `networkHits` | was DOM-only | — | ✅ `shouldSkipPathProbe` + snapshot before probe |
| Rolling ETA | N/A (monitor) | ✅ dashboard | ✅ + refuse near-zero rate |
| Extension parity | deferred | deferred | still deferred (CLI-first) |

## Tests

`test/early-exit.test.ts` + `desktop-eta` + `desktop-adapter` → **35 passed**.
