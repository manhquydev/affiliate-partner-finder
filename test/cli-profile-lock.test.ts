import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { isProfileLocked, waitUntilProfileUnlocked } from '../cli/profile-lock';

describe('profile lock wait (handoff)', () => {
  it('is unlocked when SingletonLock is absent', () => {
    const dir = join(tmpdir(), `apf-prof-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    expect(isProfileLocked(dir)).toBe(false);
    rmSync(dir, { recursive: true, force: true });
  });

  it('is locked when SingletonLock exists; wait returns false on timeout', async () => {
    const dir = join(tmpdir(), `apf-prof-lock-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'SingletonLock'), '');
    expect(isProfileLocked(dir)).toBe(true);
    const ok = await waitUntilProfileUnlocked(dir, 50);
    expect(ok).toBe(false);
    rmSync(dir, { recursive: true, force: true });
  });

  it('wait returns true once lock disappears', async () => {
    let locked = true;
    const ok = await waitUntilProfileUnlocked(
      '/unused',
      500,
      Date.now,
      async () => {
        locked = false;
      },
      () => locked,
    );
    expect(ok).toBe(true);
  });
});
