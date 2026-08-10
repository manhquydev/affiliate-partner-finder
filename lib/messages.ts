// Cross-context messaging. The scan loop runs in the dashboard page and
// broadcasts progress so an open popup can show a live status glance. IndexedDB
// is the source of truth; this is only a live nudge.

import type { Progress, ScanResult } from './types';

/** Broadcast from the dashboard whenever progress or a new result lands. */
export interface ProgressEvent {
  type: 'PROGRESS';
  progress: Progress;
  result?: ScanResult;
}

/** Popup → dashboard: a pending run request handed off via chrome.storage.session. */
export interface PendingRun {
  run: Partial<import('./types').RunConfig>;
  mode: 'new' | 'refreshStale' | 'restart';
}

export const PENDING_RUN_KEY = 'pendingRun';
