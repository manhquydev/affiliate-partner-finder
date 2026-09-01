import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** Chrome persistent-profile lock files. Do not delete — wait for the owner to exit. */
export const PROFILE_LOCK_NAMES = ['SingletonLock', 'SingletonSocket', 'SingletonCookie'] as const;

export function profileLockPaths(profileDir: string): string[] {
  return PROFILE_LOCK_NAMES.map((name) => join(profileDir, name));
}

export function isProfileLocked(profileDir: string): boolean {
  return profileLockPaths(profileDir).some((p) => existsSync(p));
}

export async function waitUntilProfileUnlocked(
  profileDir: string,
  timeoutMs = 30_000,
  now = Date.now,
  sleepFn: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  locked: (dir: string) => boolean = isProfileLocked,
): Promise<boolean> {
  const deadline = now() + Math.max(0, timeoutMs);
  while (locked(profileDir)) {
    if (now() >= deadline) return false;
    await sleepFn(250);
  }
  return true;
}

export const PROFILE_BUSY_MESSAGE =
  'Chrome profile đang bị dùng. Bấm Dừng hoặc đóng Chrome của app, rồi chạy Lấy danh sách lại.';

export function isProfileBusyError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /existing browser session|profile is already in use|SingletonLock/i.test(msg);
}
