/** Shared desktop job contracts — mirrors CLI progress.json shape. */

export type ProgressSnapshot = {
  query: string;
  total: number;
  completed: number;
  updatedAt: string;
  earlyExit: boolean;
};

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
};
