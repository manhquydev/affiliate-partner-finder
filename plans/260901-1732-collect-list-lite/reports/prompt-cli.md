Wire CLI --collect-only. Plan: plans/260901-1732-collect-list-lite/phase-02-cli-collect-only.md

Repo: /home/manhquy/Downloads/affiliate-partner-finder

ALREADY DONE (do not rewrite):
- lib/after-collect.ts afterCollectAction
- lib/export.ts toCompaniesCSV
- lib/resolve.ts domainToUrl exported

YOU MAY MODIFY:
- cli/index.ts
- test/helpers if needed
- create test/cli-collect-only-help.test.ts ONLY if you add a --help assertion (optional)

DO NOT MODIFY: desktop/, lib/export.ts, lib/after-collect.ts, lib/resolve.ts, docs/

Behavior:
1. Args.collectOnly default false; parse --collect-only; printHelp documents: stop after Trustpilot list; write companies.csv; no site scan.
2. --resume --collect-only → stderr + exit 2 BEFORE collect.
3. After collect try/finally closes browser (after cli/index.ts collect handle finally), call afterCollectAction({ collectOnly, stopRequested, count: companies.length }).
4. If kind==='exit':
   - if count>0 write companies.csv atomically (same temp+rename as atomicWriteJson)
   - return action.code
   - NEVER log scan pending or call launchScanSession
5. If kind==='scan': existing scan path unchanged (including stop+partial Full still scans).
6. onProgress: when collectOnly, also write companies.csv checkpoint (count>0).
7. count===0: do not write companies.csv.

Verify: npx vitest run test/after-collect.test.ts test/export.test.ts
If you add a help test, run it too.
Skip project-wide lint.
When done: files changed + how skip-scan is wired (function names / where return happens).
