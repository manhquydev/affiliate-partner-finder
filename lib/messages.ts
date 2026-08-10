// Message contract between popup and background service worker.

import type { Progress, ScanResult, RunConfig } from './types';

export type PopupToBg =
  | { type: 'START'; run: Partial<RunConfig> }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'CLEAR' }
  | { type: 'GET_STATE' };

/** Broadcast from background whenever progress or a new result lands. */
export interface ProgressEvent {
  type: 'PROGRESS';
  progress: Progress;
  result?: ScanResult;
}

/** Reply to GET_STATE. */
export interface StateReply {
  progress: Progress | null;
  results: ScanResult[];
}
