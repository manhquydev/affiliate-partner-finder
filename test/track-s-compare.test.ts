import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function row(
  domain: string,
  verdict: string,
  loadStatus = 'ok',
  probe = 100,
) {
  return {
    domain,
    loadStatus,
    verdict,
    timingsMs: { goto: 10, settle: 20, detector: 5, probe, total: probe + 35 },
  };
}

describe('compare-track-s-ab.mjs', () => {
  it('detects paired verdict diffs and writes TRIAL PASS when no regression', () => {
    const dir = mkdtempSync(join(tmpdir(), 'track-s-cmp-'));
    const control = join(dir, 'c.jsonl');
    const treatment = join(dir, 't.jsonl');
    writeFileSync(
      control,
      [row('a.com', 'none'), row('b.com', 'affiliate')].map((r) => JSON.stringify(r)).join('\n'),
    );
    writeFileSync(
      treatment,
      [row('a.com', 'affiliate'), row('b.com', 'affiliate', 'ok', 50)].map((r) => JSON.stringify(r)).join('\n'),
    );
    const out = execFileSync(
      process.execPath,
      [join(root, 'scripts/compare-track-s-ab.mjs'), control, treatment],
      { encoding: 'utf8' },
    );
    expect(out).toContain('**Verdict diffs:** 1');
    expect(out).toContain('**true→false (regression):** 0');
    expect(out).toMatch(/TRIAL: PASS/);
    rmSync(dir, { recursive: true, force: true });
  });
});
