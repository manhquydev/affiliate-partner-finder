import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { join } from 'node:path';

export type OutJobLock = {
  pid: number;
  out: string;
  profile: string;
  startedAt: string;
  host: string;
};

export function outJobLockPath(outDir: string): string {
  return join(outDir, '.job.lock');
}

export function isProcessAlive(pid: number): boolean {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function readOutJobLock(outDir: string): OutJobLock | null {
  const path = outJobLockPath(outDir);
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, 'utf8');
    if (!raw.trim()) return null;
    return JSON.parse(raw) as OutJobLock;
  } catch {
    return null;
  }
}

/** Remove stale lock or throw if another live process owns this out dir. */
export function assertOutJobLockFree(outDir: string, exceptPid?: number): void {
  const lock = readOutJobLock(outDir);
  if (!lock) return;
  if (exceptPid != null && lock.pid === exceptPid) return;
  if (isProcessAlive(lock.pid)) {
    throw new Error(
      `Thư mục đang được quét (PID ${lock.pid}) — dùng Tiếp tục cùng thư mục hoặc dừng process cũ trước.`,
    );
  }
  try {
    unlinkSync(outJobLockPath(outDir));
  } catch {
    /* ignore */
  }
}

export function writeOutJobLock(outDir: string, rec: Omit<OutJobLock, 'host'> & { host?: string }): void {
  const path = outJobLockPath(outDir);
  const body: OutJobLock = {
    ...rec,
    host: rec.host ?? hostname(),
  };
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(body, null, 2));
  renameSync(tmp, path);
}

export function releaseOutJobLock(outDir: string): void {
  try {
    unlinkSync(outJobLockPath(outDir));
  } catch {
    /* ignore */
  }
}
