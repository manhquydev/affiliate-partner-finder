Wire desktop Lấy danh sách. Plan: plans/260901-1732-collect-list-lite/phase-03-desktop-lay-danh-sach.md

Repo: /home/manhquy/Downloads/affiliate-partner-finder

ALREADY DONE:
- desktop/job-csv.ts resolveJobCsv
- test/job-csv.test.ts
- CLI flag will be --collect-only (another agent wires CLI; you may assume it exists)

YOU MAY MODIFY:
- desktop/types.ts JobOptions.collectOnly?: boolean
- desktop/build-scan-argv.ts
- desktop/main.ts (desktop:start whitelist + open-csv)
- desktop/job-supervisor.ts (onExit + refresh csvPath)
- desktop/renderer/index.html
- desktop/renderer/app.js
- test/desktop-adapter.test.ts
- test/windows-parity.test.ts only if argv snapshots break
- test/desktop-electron.e2e.test.ts: button visible + empty query on #btnCollectList

DO NOT MODIFY: cli/, lib/, docs/, desktop/job-csv.ts

Must:
1. Button #btnCollectList label exactly "Lấy danh sách" after Bắt đầu, before Tiếp tục. title: chỉ danh sách Trustpilot, không quét website.
2. Click: same query/limit/out validation as Start; startJob({ collectOnly:true, resume:false, query, limit, ...scanOptFlags() }).
3. desktop:start is a FIELD WHITELIST not a spread — add collectOnly?: boolean and pass collectOnly: Boolean(opts.collectOnly) to supervisor.start.
4. buildScanArgv: --collect-only iff opts.collectOnly && !opts.resume.
5. Tiếp tục never sends --collect-only.
6. Include #btnCollectList in disabled=running, lockLaunchControls, unlockLaunchControlsIfIdle.
7. onExit: skip writeSimpleCsvFromJsonl when jsonl missing OR size 0. csvPath = resolveJobCsv. Lite complete message: Đã lấy danh sách.
8. open-csv: resolveJobCsv then resolveExistingPath + isPathInside(runsRoot). Error: Chưa có CSV — chạy Lấy danh sách hoặc quét xong.
9. refresh() csvPath uses resolveJobCsv.
10. Idle UI: phase==='collect' && !running after successful lite must NOT say "Đã dừng lúc lấy danh sách…". Use: Đã lấy danh sách. Mở CSV hoặc Tiếp tục để quét website.

Verify: npx vitest run test/job-csv.test.ts test/desktop-adapter.test.ts test/windows-parity.test.ts
Skip full e2e unless you changed e2e file; if you did, run that file only.
Skip project-wide lint.
When done: files changed + test result.
