/** Classify Playwright navigation / scan-budget failures. Do not remap all throws to timeout. */

export type NavFailureKind = 'timeout' | 'error' | 'dead';

export function classifyNavFailure(err: unknown): NavFailureKind {
  const name = err && typeof err === 'object' && 'name' in err ? String((err as { name: unknown }).name) : '';
  const msg = err instanceof Error ? err.message : String(err ?? '');
  if (
    /Target closed|has been closed|browser has been closed|Connection closed|browser disconnected|disconnected/i.test(
      msg,
    )
  ) {
    return 'dead';
  }
  if (name === 'TimeoutError' || /Timeout \d+ms exceeded|exceeded \d+ms/i.test(msg)) {
    return 'timeout';
  }
  return 'error';
}

export class BrowserDeadError extends Error {
  override name = 'BrowserDeadError';
  constructor(message: string) {
    super(message);
  }
}
