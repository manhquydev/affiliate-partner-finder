import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = path.join(ROOT, 'scripts/check-win-smoke-signoff.sh');
const FIXTURE = path.join(ROOT, 'plans/reports/test-260826-win-smoke-110.md');

function runCheck(reportPath: string): number {
  try {
    execFileSync(CHECK, [reportPath], { cwd: ROOT, stdio: 'pipe' });
    return 0;
  } catch (err) {
    const e = err as { status?: number };
    return e.status ?? 1;
  }
}

describe('check-win-smoke-signoff', () => {
  const temps: string[] = [];

  afterEach(() => {
    for (const f of temps) fs.unlinkSync(f);
    temps.length = 0;
  });

  function writeTemp(body: string): string {
    const f = path.join(os.tmpdir(), `smoke-${Date.now()}-${Math.random()}.md`);
    fs.writeFileSync(f, body);
    temps.push(f);
    return f;
  }

  it('rejects the live pending checklist on main', () => {
    expect(runCheck(FIXTURE)).toBe(1);
  });

  it('rejects template placeholder PASS / FAIL wording', () => {
    const f = writeTemp(`## Sign-off\n- Result: PASS / FAIL\n`);
    expect(runCheck(f)).toBe(1);
  });

  it('rejects _pending_ placeholder', () => {
    const f = writeTemp(`## Sign-off\n- Result: _pending_ (replace with exactly \`PASS\` or \`FAIL\` after test)\n`);
    expect(runCheck(f)).toBe(1);
  });

  it('accepts exact - Result: PASS sign-off', () => {
    const f = writeTemp(`## Sign-off\n- Tester: ops\n- Date: 2026-08-26\n- Result: PASS\n`);
    expect(runCheck(f)).toBe(0);
  });
});
