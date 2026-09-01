Implement afterCollectAction from plans/260901-1732-collect-list-lite/phase-02-cli-collect-only.md. Do NOT wire cli/index.ts yet. Do NOT touch lib/export.ts.

Repo: /home/manhquy/Downloads/affiliate-partner-finder

Create:
- lib/after-collect.ts
- test/after-collect.test.ts

Contract (chrome-free, no I/O):

export type AfterCollectAction =
  | { kind: 'scan' }
  | { kind: 'exit'; code: 0 | 1 | 130 };

export function afterCollectAction(opts: {
  collectOnly: boolean;
  stopRequested: boolean;
  count: number;
}): AfterCollectAction

Rules:
- count <= 0 && stopRequested → { kind:'exit', code:130 }
- count <= 0 && !stopRequested → { kind:'exit', code:1 }
- collectOnly && count > 0 && stopRequested → { kind:'exit', code:130 }
- collectOnly && count > 0 && !stopRequested → { kind:'exit', code:0 }
- else → { kind:'scan' }

Unit-test all five rows.
Verify: npx vitest run test/after-collect.test.ts
Skip project-wide lint/format.
When done, reply with files changed and test result only.
