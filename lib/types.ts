// Data schema — mirrors docs/06-data-schema.md exactly. Source of truth for the
// whole pipeline. Keep field names identical to the docs and the export columns.

/** Final classification of a scanned site. */
export type Verdict = 'affiliate' | 'partner_trade' | 'none' | 'unknown';

/** Confidence attached to a verdict. `blocked` pairs only with `unknown`. */
export type Confidence = 'high' | 'medium' | 'low' | 'blocked';

/** Whether the target page loaded well enough to trust a verdict. */
export type LoadStatus = 'ok' | 'blocked' | 'timeout' | 'error';

/** Scan run mode: collect new / re-scan stale / wipe and restart. */
export type RunMode = 'new' | 'refreshStale' | 'restart';

/** Lifecycle of a single company job (docs/04 §4). */
export type JobState =
  | 'queued'
  | 'resolving'
  | 'scanning'
  | 'done'
  | 'blocked'
  | 'error';

/** A company collected from Trustpilot (docs/06 §1). */
export interface Company {
  name: string;
  /** identifyingName from Trustpilot — this is the domain. */
  domain: string;
  trustScore: number | null;
  reviews: number | null;
  trustpilotUrl: string;
}

/** One matched anchor found by the link-scan layer. */
export interface LinkHit {
  text: string;
  href: string;
  /** matched strong + weak keywords, combined. */
  kw: string[];
  /** matched affiliate-platform hosts, if any. */
  platform: string[];
  /** strong = matched a strong keyword OR an affiliate platform host. */
  isStrong: boolean;
}

/** One path that responded differently from the junk baseline. */
export interface PathHit {
  path: string;
  status: number;
  finalUrl: string;
  /** strong = the path itself contains "affiliat". */
  isStrong: boolean;
}

/** Everything the detector observed — every verdict must be backed by this. */
export interface Evidence {
  linkHits: LinkHit[];
  platformHits: string[];
  pathHits: PathHit[];
  /**
   * Affiliate-platform hosts seen on network request/response URLs (CLI).
   * Optional for back-compat with extension / pre-network results.
   * When present and used for a verdict, export method should be `network`
   * and detectorVersion should reflect network-capable scans (phase 2+).
   */
  networkHits?: string[];
  /** HTTP status of a random junk path; guards against soft-404 (docs/05 §C1). */
  junkBaselineStatus: number | 'err' | null;
  /** total <a> count seen — used for the bot-block heuristic. */
  totalLinks?: number;
}

/** Result of scanning one company's website (docs/06 §2). */
export interface ScanResult {
  domain: string;
  websiteUrl: string;
  finalUrl: string;
  loadStatus: LoadStatus;
  verdict: Verdict;
  confidence: Confidence;
  evidence: Evidence;
  scannedAt: string; // ISO 8601
  detectorVersion: string;
  /** carried through for reporting/export. */
  name?: string;
  trustScore?: number | null;
  reviews?: number | null;
  /** Opt-in CLI phase timings (--profile-timing); omitted from end-user CSV. */
  timingsMs?: {
    goto: number;
    settle: number;
    detector: number;
    probe: number;
    total: number;
  };
}

/** Raw output of the injected in-page detector (before path-probe merge). */
export interface DetectorResult {
  loadStatus: LoadStatus;
  totalLinks: number;
  linkHits?: LinkHit[];
  platformHits?: string[];
}

/** Raw output of the same-origin path-probe. */
export interface PathProbeResult {
  junkBaselineStatus: number | 'err';
  pathHits: PathHit[];
  /** True when inner deadline skipped remaining chunks. Omit/false = full walk. */
  incomplete?: boolean;
}

/** Only the fields classify() needs — keeps it a pure function. */
export interface ClassifyInput {
  loadStatus: LoadStatus;
  linkHits?: LinkHit[];
  platformHits?: string[];
  /** Network-observed platform hosts — folded like platformHits (strong evidence). */
  networkHits?: string[];
  pathHits?: PathHit[];
  junkBaselineStatus?: number | 'err' | null;
}

export interface Classification {
  verdict: Verdict;
  confidence: Confidence;
}

/** Detector config — keyword/platform/path lists (docs/05). Extensible per NFR-05. */
export interface DetectorConfig {
  strong: string[];
  weak: string[];
  platforms: string[];
  paths: string[];
  detectorVersion: string;
}

/** Run-time knobs for a scan run. */
export interface RunConfig {
  query: string;
  limit: number;
  delayMs: number;
  maxRetries: number;
  tabTimeoutMs: number;
  /** if true, resolve exact websiteUrl via Trustpilot review page; else use domain. */
  resolveViaReviewPage: boolean;
  /** re-scan a domain whose result is older than this many days (refreshStale mode). */
  staleDays: number;
}

/** Persisted progress cursor so a run resumes after popup close / SW kill. */
export interface Progress {
  running: boolean;
  paused: boolean;
  query: string;
  total: number;
  completed: number;
  currentDomain: string | null;
  updatedAt: string;
  /** surfaced to the popup when a phase fails (e.g. Trustpilot bot-check). */
  error?: string | null;
  /** which mode the active run uses — so resume re-derives the right work set. */
  mode?: RunMode;
}
