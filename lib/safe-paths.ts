import { isAbsolute, resolve } from 'node:path';

/** Personal Chrome / Edge User Data — must never be used as scan profile (PRODUCT.md). */
export const FORBIDDEN_PROFILE_RE =
  /(Google[/\\]Chrome[/\\]User Data|google-chrome[/\\]User Data|Chromium[/\\]User Data|Microsoft[/\\]Edge[/\\]User Data)/i;

/** Reject browser default User Data and require absolute profile paths. */
export function assertSafeProfilePath(profile: string): string {
  const normalized = resolve(profile);
  if (FORBIDDEN_PROFILE_RE.test(normalized)) {
    throw new Error('profile must not be the browser default User Data directory');
  }
  if (!isAbsolute(normalized)) {
    throw new Error('profile must be an absolute path');
  }
  return normalized;
}
