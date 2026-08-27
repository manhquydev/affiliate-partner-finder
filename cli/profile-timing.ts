// Opt-in CLI phase timings (--profile-timing). Default OFF: callers skip Date.now
// except one branch. Never written to end-user CSV.

import type { ScanResult } from '../lib/types';

export type ProfilePhaseMs = {
  goto: number;
  settle: number;
  detector: number;
  probe: number;
};

/** Mutates `result` only when enabled. `now` is injectable for tests. */
export function attachProfileTimings(
  result: ScanResult,
  enabled: boolean,
  startedAt: number,
  parts: ProfilePhaseMs,
  now?: number,
): void {
  if (!enabled) return;
  result.timingsMs = {
    goto: parts.goto,
    settle: parts.settle,
    detector: parts.detector,
    probe: parts.probe,
    total: (now ?? Date.now()) - startedAt,
  };
}
