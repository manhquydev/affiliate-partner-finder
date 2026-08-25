/** Shared desktop job contracts — mirrors CLI progress.json shape. */

import type { EtaSnapshot } from './eta.ts';

export type ProgressSnapshot = {
  query: string;
  total: number;
  completed: number;
  updatedAt: string;
  earlyExit: boolean;
  /** User-requested collect cap (--limit). May be larger than `total` if Trustpilot ran out. */
  requestedLimit?: number;
  phase?: 'collect' | 'scan';
  collectStopReason?: string;
};

export type { EtaSnapshot };

export type KetQuaCounts = {
  true: number;
  false: number;
  unknown: number;
};

export type JobOptions = {
  query?: string;
  limit?: number;
  out: string;
  resume?: boolean;
  profile: string;
  concurrency?: number;
  delayMs?: number;
  maxPages?: number;
  scanProfile?: boolean;
  acceptFailures?: boolean;
  earlyExit?: boolean;
  /**
   * Opt-in CLI `--lazy-settle`. Default OFF — desktop must not enable unless operator sets it.
   * When true, MO+scroll settle replaces fixed 1200ms (does not stack).
   */
  lazySettle?: boolean;
  /**
   * Opt-in CLI `--network-evidence`. Default OFF — observe request/response platform hosts.
   */
  networkEvidence?: boolean;
  /**
   * Hide headed Chrome off the primary display via `--virtual-display`.
   * Linux: Xvfb. Windows/macOS: minimized/off-screen window. Default ON.
   */
  virtualDisplay?: boolean;
  /** Test / override; default process.platform */
  platform?: NodeJS.Platform;
};

export type JobRecord = {
  pid: number;
  out: string;
  profile: string;
  startedAt: string;
  query?: string;
};

export type JobStatus = {
  state: 'idle' | 'running' | 'stopping' | 'error';
  progress: ProgressSnapshot | null;
  counts: KetQuaCounts;
  currentDomains: string[];
  message?: string;
  outDir?: string;
  csvPath?: string;
  /** Rolling completion estimate while running (and last snapshot when idle). */
  eta?: EtaSnapshot | null;
};
