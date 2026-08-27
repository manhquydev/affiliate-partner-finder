# Security & Ethics Audit Report

**Project:** affiliate-partner-finder (v1.0.10)  
**Date:** 2026-08-27  
**Mode:** audit-only (read-only). No `--fix`. No Cloudflare/CAPTCHA bypass attempted or recommended.  
**Skill:** `/ak:security` STRIDE + OWASP + secret/dep scan, scoped to ethics data-handling gates.  
**Auditor constraint:** code review only; no live challenge solving, no solver tooling, no CF evasion.

### Scope

Source of truth: `lib/`, `cli/`, `desktop/`, `entrypoints/`, `test/` (ethics contracts), `docs/` ethics/NFR, `package.json`, `.github/workflows/`, `scripts/shard-scan.mjs`.

Not executed: live Trustpilot/target crawls, CAPTCHA interaction, personal Chrome profile attach.

### Ethics gates (requested)

| Gate | Result | Evidence |
|------|--------|----------|
| `blocked ≠ none` | **PASS** | `classify()` returns `unknown/blocked` whenever `loadStatus !== 'ok'`. End-user CSV uses `simpleHit()` → `unknown`, never `false`. Tests + golden verifier enforce 0 blocked→none. |
| `concurrency ≤ 3` | **PASS** (product surfaces) / **GAP** (operator shards) | CLI `--concurrency` and desktop `clampConcurrency` hard-cap 1..3. Probe batch 1..3. Extension scans 1 tab. `shard-scan` multiplies shards × per-shard concurrency with **unbounded `--shards`**. |
| No CF / CAPTCHA bypass | **PASS** | No solver/stealth/cloudscraper libraries. Collect throws and asks a human to pass the check in the app Chrome. Desktop CF panel: “Không tự vượt CAPTCHA.” |
| CSV PII | **PASS** with residual formula edge | End-user CSV is `ten_cong_ty,website,ket_qua,huong_dan` (public company fields). Formula prefix `=+-@` neutralized. No emails/cookies/tokens in schema. Local files only. |
| Chrome profile sharing | **PASS** (desktop) / **GAP** (CLI `--profile`) | Desktop `assertSafeJobPaths` rejects `User Data` and pins profile under app-owned root. CLI `--profile` is a free path; default is app cache, not personal Chrome. Extension uses the live user session by design. |

---

## Summary

- Files / modules reviewed: ethics-critical paths in classify, export, scan (lib+CLI), browser launch, desktop IPC/spawn, extension dashboard, shard operator script, CI/release.
- Findings: **0 critical**, **1 high**, **3 medium**, **3 low**, **4 info**
- Secrets: **none** (no AWS keys, JWTs, PEM, `ghp_`, Stripe `sk_`).
- `npm audit --omit=dev`: **0** production vulnerabilities (`idb` only).
- `npm audit` (dev): **18** (5 critical / 8 high / 5 moderate) — Electron, WXT/vitest toolchain; not shipped in `results.csv`.

### Findings

| # | Severity | Category | File:Line | Description | Fix Recommendation |
|---|----------|----------|-----------|-------------|-------------------|
| 1 | High | Ethics / Info disclosure | `cli/index.ts:116` | `--profile` accepts any directory. No `FORBIDDEN_PROFILE_RE` / app-root check. Operator can point Playwright at personal `Chrome/User Data`. Persistent context then drives that profile at every scanned origin (`--scan-profile`). PRODUCT.md forbids this. | Reuse `assertSafeJobPaths` from `desktop/progress.ts`. Reject User Data paths. Default stays `~/.cache/affiliate-partner-finder/chrome-profile`. Do **not** “fix” CF by attaching the personal profile. |
| 2 | Medium | Ethics / DoS-to-targets | `scripts/shard-scan.mjs:65` | `--shards` has no upper bound. Global site parallelism = shards × per-shard concurrency (itself ≤3). Default 3×2 = 6; 10 shards × 3 = 30 concurrent site loads. Customer GUI/CLI cap is 3. | Cap `--shards` (e.g. 3) and/or `shards * concurrency ≤ 3` unless an explicit `--i-understand-load` operator flag. Keep per-shard clamp. |
| 3 | Medium | XSS (A03) | `entrypoints/options/main.ts:128,155,172` | Detail-row `innerHTML` interpolates `r.finalUrl`, `h.href`, `p.finalUrl` into `href="..."` **without** `escapeHtml`. Text nodes are escaped. A scanned page with an affiliate-keyword link whose `href` contains `"` or a `javascript:` URL can execute in the extension dashboard (tabs/storage). Popup path uses DOM APIs and is safer. | Build `<a>` with `createElement` + property `href` after allowing only `http:`/`https:`. Never string-interpolate URLs into HTML. |
| 4 | Medium | Insecure design (A04) ethics | `cli/index.ts:113,398` vs `desktop/build-scan-argv.ts:25-27` | CLI `--delay-ms` allows `0`. Scan-loop delay is start-stagger `i * min(delayMs, 500)`, not a 1–3s inter-request gap. Desktop `clampDelayMs` ≥ 1000. NFR-01 (`docs/02`) asks 1–3s delay. | Clamp CLI delay like desktop (`Math.max(1000, …)`). Treat stagger as extra, not a substitute for ethics delay. |
| 5 | Low | CSV injection (A03) | `lib/export.ts:82-87` | `csvCell` prefixes `' ` when the cell starts with `=+-@` / tab / CR. Does not cover Excel DDE `\|` or Unicode lookalikes (`＋`, fullwidth equals). Company names come from Trustpilot (untrusted). Test covers `=HYPERLINK`. | Extend the prefix set (`\|`, `\t`, Unicode Cf/equals). Keep quoting. Do not add extra PII columns. |
| 6 | Low | Ethics residual `blocked≠none` | `lib/detector.ts:17-51` | Challenge detection is phrase + `<5` anchors. A CF/WAF interstitial with many links and no listed phrases can be `loadStatus=ok` → `none`/`ket_qua=false`. Inverse of the product rule. | Keep unknown-on-non-ok. Optionally treat known WAF titles/AWS challenge copy as blocked. **Never** add a solver to “reduce unknown”. |
| 7 | Low | ToS / robots (A04) | `lib/collect.ts:3-9`, README “Pháp lý” | Trustpilot `robots.txt` Disallow `/search` is documented; collect still paginates `/search` in a real headed Chrome session (not a server-side fetch bypass of CF). User ToS disclaimer exists. No `robots.txt` parser in code. | Keep human CF, concurrency ≤3, local-only. Do not add automation against the challenge. Document that 10k jobs are operator-scale and ToS-sensitive. |
| 8 | Info | Vulnerable components (A06) | `package.json` electron `^37.10.3` | Dev `npm audit`: Electron 37 is in range for multiple GHSA (contextIsolation bypass, `shell.openPath` NUL, UAFs). Desktop renderer is local `loadFile` with `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. Exploitability from scanned sites into Electron is low. | Plan Electron 39.8.x / 44 when packing. Do not `--no-sandbox` in packaged builds (`desktop:dev` and CI e2e already disable sandbox). |
| 9 | Info | Supply chain (A06) | `wxt@0.19`, `vitest@^2.1` | Critical/high in `tar`/`shell-quote`/`vitest` UI via WXT/web-ext-run. `vitest run` (not UI server) is what CI uses. Not in production dependency tree (`npm audit --omit=dev` = 0). | Upgrade WXT/vitest on a dedicated chore; do not `--force` as a security hotfix without a build check. |
| 10 | Info | Integrity (A08) | `desktop/electron-builder.yml:30` | `signAndEditExecutable: false`. Windows installers are unsigned. | Code-signing is already an explicit undecided product item. Track as release hygiene, not an ethics defect. |
| 11 | Info | Misconfiguration (A05) | `package.json:23`, `.github/workflows/ci.yml:41` | `electron --no-sandbox` (dev) and `ELECTRON_DISABLE_SANDBOX=1` (CI/e2e). Packaged `desktop/main.ts` enables renderer sandbox. | Keep sandbox on in production. Do not copy `--no-sandbox` into `electron-builder` extra args. |

No captcha-solver, stealth plugin, `AutomationControlled` hide, cloudscraper, or FlareSolverr usage in `cli/`, `lib/`, `desktop/`, `entrypoints/`.

---

## Gate detail

### 1. `blocked ≠ none` — PASS

Classifier (only assignment of `verdict: 'none'`):

```18:21:lib/classify.ts
  // Row 1 — could not trust the page: never conclude 'none'.
  if (loadStatus !== 'ok') {
    return { verdict: 'unknown', confidence: 'blocked' };
  }
```

`none` is reachable only after `loadStatus === 'ok'` and zero hits (row 6).

End-user CSV does **not** use `verdict` for `ket_qua`:

```120:131:lib/export.ts
export function simpleHit(r: ScanResult): SimpleHit {
  if (r.loadStatus !== 'ok') return 'unknown';
  // …hits → true…
  return 'false';
}
```

Timeout/error/blocked in `lib/scan.ts` and `cli/scan.ts` call `classify({ loadStatus: 'timeout'|'error'|det.loadStatus })`. Incomplete path-probe without homepage signals is forced to `timeout` so it cannot become a confident false (`cli/scan.ts:231-238`).

`--accept-failures` only skips retry (`cli/index.ts:173-176`); it does not remap blocked→none.

Tests: `test/classify.test.ts` rows 1, 2d, blocked-never-none, golden `0 blocked→none`; `test/export.test.ts` simpleHit blocked→unknown; `test/verify-golden.mjs` fails on `loadStatus !== ok && verdict === none` and `simpleHit === 'false'`.

UI copy: `lib/labels.ts` unknown legend “⚠ Đây KHÔNG phải ‘không có’.”

**Residual:** detector heuristic miss (finding 6). Not a classify bug.

### 2. `concurrency ≤ 3` — PASS on product, GAP on shards

| Surface | Cap | Default |
|---------|-----|---------|
| CLI `--concurrency` | `Math.min(3, Math.max(1, …))` (`cli/index.ts:112`) | 2 |
| Desktop GUI | checkbox 3 vs 2; `clampConcurrency` max 3 | turbo checkbox on → 3 |
| `--probe-batch-size` | `clampProbeBatchSize` 1..3 (`lib/probe-batch.ts`) | 3, flag default **OFF** |
| Extension `scanList` | serial, 1 tab (`lib/run-engine.ts`) | delay 2000 ms |
| Shard workers | per-shard concurrency 1..3; **`--shards` unbounded** | 3 shards × 2 |

Desktop spawn is `shell: false` argv array (`desktop/job-supervisor.ts:130-138`) — no shell injection via concurrency flags.

### 3. No CF bypass — PASS

- Collect: on challenge with zero companies, throw: “Pass the check in the profile browser… **No CAPTCHA bypass.**” (`cli/collect.ts:93-95`). Same for extension collect (`lib/collect.ts:68-69`).
- CLI may wait 90s with a visible window for a **human** solve (`cli/index.ts:289-293`); that is wait-for-user, not a solver.
- Desktop CF panel (`desktop/renderer/index.html:240-246`): complete check in app Chrome; “Không tự vượt CAPTCHA. Không dùng bộ giải captcha.”
- Headed system Chrome is used so a **human** can pass CF (`cli/browser.ts:41-65`). Hide-window args are off-screen/minimize only (`cli/hide-chrome-window.ts`) — not anti-detect.
- `--scan-profile` reuses **domain-scoped** cookies from the app profile after a human pass. That is session reuse, not challenge breaking. Do not treat it as a bypass to expand.

### 4. CSV handling / PII — PASS with residual

**End-user CSV** (`toSimpleCSV`): company name (Trustpilot public), website, `true|false|unknown`, Vietnamese hint. No `confidence`, `loadStatus`, `timingsMs`, cookies, emails.

**Operator CSV/JSON** (`results.full.csv`, `results.json`, `results.jsonl`): domain, URLs, verdict, evidence, trustScore, reviews, optional timings. Still public-page metadata. Local `--out` / desktop runs dir.

Formula guard + test (`lib/export.ts:81-87`, `test/export.test.ts:48-52`).

Desktop open-CSV: `realpath` + `isPathInside(runsRoot)` (`desktop/main.ts:292-300`) — symlink escape out of runs root blocked.

CLI `--out` can write anywhere (operator tool). Desktop cannot.

No telemetry `fetch` to third-party analytics in app code. Network is Trustpilot + target sites + optional same-origin path-probe `fetch`.

### 5. Chrome profile — desktop PASS, CLI GAP

| Product | Profile location | Guard |
|---------|------------------|-------|
| CLI default | `~/.cache/affiliate-partner-finder/chrome-profile` | none beyond default |
| Desktop Linux | `~/.cache/…/chrome-profile-desktop` | `assertSafeJobPaths` + `allowedProfileRoot`; IPC start **ignores** client profile, uses `profileRoot` |
| Desktop Windows | `%LOCALAPPDATA%/affiliate-partner-finder/chrome-profile` | same |
| Extension | user’s live Chrome | inherent; NFR-04 “don’t touch user cookies” is **not** true for the MV3 product — collect *depends* on the user session to pass Trustpilot CF |

`FORBIDDEN_PROFILE_RE` matches Google Chrome / Chromium / Edge User Data (`desktop/progress.ts:5-32`). Tested in `test/desktop-adapter.test.ts`.

`--scan-profile` on desktop is always on (`desktop/main.ts:255`). Safe only because the profile is app-owned and empty until the user solves CF there. If they sign into Google inside that window, subsequent target navigations send those cookies. Document as operator hygiene (already: don’t share CLI profile with desktop smoke).

Extension `host_permissions: <all_urls>` (`wxt.config.ts:13`) is required to inject the detector. Residual: any site can be scripted; keep injection read-only (current: `runDetector` / `pathProbe` only, no click/fill/submit).

---

## STRIDE

| Category | Status | Notes |
|----------|--------|-------|
| Spoofing | N/A (local) | No user accounts. Electron IPC is same-machine. Preload expose is a fixed allowlist (`desktop/preload.cjs`). |
| Tampering | Partial | Desktop out/profile path containment + job lock. CLI `--out`/`--profile` unconstrained. CSV formula prefix. Extension href XSS. Spawn argv, not shell. |
| Repudiation | Acceptable for v1 | `results.jsonl` append + fsync; `progress.json`; no auth logs (no auth). |
| Information disclosure | Partial | Finding 1 (personal profile). CSV is public company data. No secrets in repo. Renderer sandbox on. |
| Denial of service | Ethics-facing | Concurrency caps protect **targets** more than the app. Unbounded shards (finding 2). Scan budget 120s/company. `closeQuietly` 3s. |
| Elevation of privilege | Local | Extension dashboard XSS → extension APIs (finding 3). Electron isolation is on; Electron GHSA residual (info). |

## OWASP Top 10

| ID | Result |
|----|--------|
| A01 Broken Access Control | Desktop path/profile guards. CLI missing. Extension `<all_urls>` by design. |
| A02 Cryptographic Failures | No passwords. Unsigned Windows artifacts (info). |
| A03 Injection | CSV formula (tested). Extension href XSS. No SQL. Spawn without shell. |
| A04 Insecure Design | Ethics model is explicit and mostly encoded. Gaps: CLI profile, CLI delay 0, shard fan-out, no robots parser. |
| A05 Misconfiguration | Dev/CI `--no-sandbox` only. Renderer sandbox true in `main.ts`. |
| A06 Vulnerable Components | Prod 0. Dev Electron/WXT/vitest. |
| A07 Auth Failures | No remote auth. |
| A08 Software Integrity | Unsigned NSIS. CI `contents: read` on test; release `contents: write` + `GITHUB_TOKEN` for gh-release only. |
| A09 Logging | CLI logs domain + verdict, not cookies. JSONL is the audit trail. |
| A10 SSRF | Path-probe `fetch` is same-origin from the scanned page. Companies come from Trustpilot (or operator `companies.json`). Local tool, not a server SSRF. |

## Red-team lenses (bounded, no exploit steps)

1. **External adversary:** malicious target site → stored XSS in extension options detail row (finding 3). Electron renderer is not a web origin. No CF bypass available in-tree to steal clearance cookies remotely.
2. **Supply chain:** Electron/WXT/vitest GHSA in **devDependencies**. Production runtime dependency is `idb` only; packaged desktop also embeds bundled CLI + Electron.
3. **Insider / operator:** `--profile` to User Data (finding 1); shard storm (finding 2); `--delay-ms 0`. Desktop GUI cannot do these.
4. **Infrastructure:** no cloud. Profiles and CSVs live on disk under app/user dirs. `.gitignore` covers `.env`, `out/`, `dist-desktop/`.

## Secret detection

Patterns from `ak:security` checklist (API keys, `AKIA`, JWT `eyJ`, PEM, `ghp_`, Stripe, bearer): **no matches** in `cli/`, `lib/`, `desktop/`, `entrypoints/`, `scripts/`, `.github/`. `.env` is gitignored; no `.env` tracked.

## Credential / PII hygiene of outputs

| Artifact | PII-ish fields | End-user? |
|----------|----------------|-----------|
| `results.csv` | company name, website, triage, hint | yes |
| `results.full.csv` | domain, URLs, verdict, evidence, scores | operator |
| `results.json(l)` | full `ScanResult` + optional `timingsMs` | operator |
| Chrome profile dir | CF cookies, any login the user performs in app Chrome | machine-local |

Do not add cookies, emails, or Trustpilot session tokens to CSV.

---

## Ethics verdict (product principles)

PRODUCT.md / README commitments that **hold in code** for the customer desktop:

- Blocked/timeout is never sold as “no program”.
- Parallel site scans ≤ 3 in the GUI/CLI flag.
- No login/submit/click on target sites (goto + evaluate detector/probe only).
- No CAPTCHA solver.
- Desktop profile is not personal Chrome User Data.
- Data stays on disk; no app telemetry.

Commitments that **do not fully hold**:

- CLI can attach an arbitrary Chrome profile (must-not in PRODUCT.md).
- Operator `shard-scan` can exceed 3 global browsers.
- Extension **does** use the user’s real session (documented tradeoff vs NFR-04).
- `robots.txt` is respected in prose, not in a parser; `/search` is collected via a headed session.

**Do not “fix” remaining unknowns with Cloudflare bypass, captcha farms, or personal-profile sharing.** That would violate the product ethics bound even if it raised golden-set recall.

---

## Recommendations (priority)

1. **This sprint:** CLI `--profile` reject User Data + optional allowed root (copy desktop guard). Extension dashboard: DOM links, http(s) only.
2. **Next sprint:** cap shard global parallelism; CLI `delay-ms` min 1000.
3. **Backlog:** Electron upgrade before the next signed Windows build; CSV `|`/Unicode formula; optional extra WAF title phrases for `blocked`.
4. **Never:** captcha solvers, stealth/webdriver hiding as CF evasion, pointing default profile at `Chrome/User Data`, treating blocked as `ket_qua=false`.

---

## Coverage

```
=== Ethics gates ===
blocked≠none[✓]  concurrency≤3 product[✓] shards[✗]  no-CF-bypass[✓]  CSV-PII[✓]  Chrome-profile desktop[✓] CLI[✗]

=== STRIDE ===
S[n/a] T[partial] R[✓] I[partial] D[partial] E[partial] —  ethics-focused local app

=== OWASP ===
A01[partial] A02[✓] A03[partial] A04[partial] A05[✓] A06[dev] A07[n/a] A08[info] A09[✓] A10[✓]

Findings: 0 Critical, 1 High, 3 Medium, 3 Low, 4 Info
```

**Status:** DONE  
**Read-only:** no code changes.  
**Blocked reviews:** none — all five gates reviewed with file:line evidence; none skipped.
