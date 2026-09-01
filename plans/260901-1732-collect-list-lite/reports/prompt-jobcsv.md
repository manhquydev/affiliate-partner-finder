Implement resolveJobCsv helper only. Do NOT modify desktop/main.ts, job-supervisor.ts, renderer, or CLI.

Repo: /home/manhquy/Downloads/affiliate-partner-finder

Create:
- desktop/job-csv.ts
- test/job-csv.test.ts (vitest; use fs mkdtemp, do not import electron)

Contract:
export function resolveJobCsv(outDir: string): string | undefined
- If outDir/results.csv exists → return that path (join)
- Else if outDir/companies.csv exists → return that path
- Else undefined
- results.csv wins when both exist
- Do not open files; existsSync only

Tests: neither; only companies; only results; both → results.
Verify: npx vitest run test/job-csv.test.ts
Skip project-wide lint/format.
When done, reply with files changed and test result only.
