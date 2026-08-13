// Pure helper: skip path-probe only when homepage already has strong affiliate
// evidence (matches classify row 2). Used by CLI --early-exit (default OFF).

import type { DetectorResult } from './types';

export type EarlyExitSignal = Pick<DetectorResult, 'loadStatus' | 'linkHits' | 'platformHits'> & {
  /** When --network-evidence is on, treat observed platform hosts like DOM platformHits. */
  networkHits?: string[];
};

export function shouldSkipPathProbe(det: EarlyExitSignal): boolean {
  if (det.loadStatus !== 'ok') return false;
  const strongLink = (det.linkHits ?? []).some((h) => h.isStrong);
  const hasPlatform =
    (det.platformHits ?? []).length > 0 || (det.networkHits ?? []).length > 0;
  return strongLink || hasPlatform;
}
