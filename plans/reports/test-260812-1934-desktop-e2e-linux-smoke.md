# Test — desktop Electron E2E + Ubuntu smoke (2026-08-12 19:34 +07)

## Commands

| Command | Result |
|---------|--------|
| `npm test` | 95/95 pass (unit, excludes e2e) |
| `npm run test:desktop:e2e` | **6/6 pass** (dev + packaged linux-unpacked) |
| `npm run desktop:pack:linux` | AppImage + deb built |

## E2E coverage (Playwright `_electron`)

- VI shell loads, no default `design`
- Empty query blocked on Start
- Custom keyword input
- Stop disabled idle
- Query sync from `progress.json`
- Packaged `linux-unpacked/affiliate-partner-finder` opens renderer

## Ubuntu smoke (this host)

- **AppImage:** launched with `--no-sandbox --user-data-dir=/tmp/apf-appimage-smoke` — process alive, E2E pass
- **deb:** `sudo dpkg -i affiliate-partner-finder_1.0.2_amd64.deb` — requires user sudo (not automated here)

## Artifacts

- `dist-desktop/Affiliate Partner Finder-1.0.2.AppImage`
- `dist-desktop/affiliate-partner-finder_1.0.2_amd64.deb`

## Verdict

Desktop v1.0.2 query UX + Linux pack **ready for release tag**.
