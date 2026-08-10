// Run engine — the scan orchestration loop. Runs in the DASHBOARD PAGE (options),
// NOT the service worker: an open extension page has no MV3 SW lifetime limits,
// so long unattended runs no longer stall / need a manual "Resume" (research Q1a).
//
// Cross-run behavior (research Q2):
//  - results/companies in IndexedDB are a DURABLE cache; START does not wipe them
//    (except mode 'restart').
//  - de-dup by domain: already-scanned domains are skipped, so repeat runs page
//    forward and collect NEW companies.
//  - 'refreshStale' re-scans cached companies whose result is older than staleDays.
//
// A chrome.storage.session lock prevents two open dashboards from double-scanning.

import { collect } from './collect';
import { resolve } from './resolve';
import { scanOne } from './scan';
import { DEFAULT_RUN_CONFIG } from './config';
import { getEffectiveConfig } from './detector-config';
import {
  saveCompanies,
  getCompanies,
  saveResult,
  getResults,
  setProgress,
  getProgress,
  setRunConfig,
  getRunConfig,
  clearRun,
} from './storage';
import type { Company, ScanResult, Progress, RunConfig, RunMode, DetectorConfig } from './types';

export type { RunMode } from './types';

export interface RunHooks {
  onProgress: (p: Progress, r?: ScanResult) => void;
  onError?: (msg: string) => void;
  onDone?: (summary: { completed: number; total: number }) => void;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const iso = () => new Date().toISOString();

// ---------- pure helpers (unit-tested) ----------

export function isStale(scannedAt: string, staleDays: number, now: number): boolean {
  const t = Date.parse(scannedAt);
  if (Number.isNaN(t)) return true;
  return now - t > staleDays * 86_400_000;
}

/** Cached companies that have no result yet, or whose result is stale. */
export function pickStaleCompanies(
  companies: Company[],
  results: Map<string, ScanResult>,
  staleDays: number,
  now: number,
): Company[] {
  return companies.filter((c) => {
    const r = results.get(c.domain);
    return !r || isStale(r.scannedAt, staleDays, now);
  });
}

/** Cached companies not yet scanned at all (used by resume-after-close). */
export function pickUnscanned(companies: Company[], results: Map<string, ScanResult>): Company[] {
  return companies.filter((c) => !results.has(c.domain));
}

// ---------- duplicate-dashboard lock (chrome.storage.session) ----------

const TAB_ID: string =
  globalThis.crypto?.randomUUID?.() ?? `t-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const LOCK_KEY = 'runLock';
const LOCK_TTL_MS = 12_000;

interface Lock {
  owner: string;
  ts: number;
}

async function lockHeldByOther(): Promise<boolean> {
  try {
    const l = (await chrome.storage.session.get(LOCK_KEY))[LOCK_KEY] as Lock | undefined;
    return !!l && l.owner !== TAB_ID && Date.now() - l.ts < LOCK_TTL_MS;
  } catch {
    return false;
  }
}
async function heartbeat(): Promise<void> {
  try {
    await chrome.storage.session.set({ [LOCK_KEY]: { owner: TAB_ID, ts: Date.now() } satisfies Lock });
  } catch {
    /* session storage unavailable — ignore */
  }
}

// Keep the lock fresh on an INDEPENDENT timer, not once-per-iteration: a single
// iteration (resolve + scan + retries) can exceed the 12s TTL, which would let a
// second dashboard steal the lock and double-scan (review H1).
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
function startHeartbeat() {
  stopHeartbeat();
  void heartbeat();
  heartbeatTimer = setInterval(() => void heartbeat(), 4000);
}
function stopHeartbeat() {
  if (heartbeatTimer !== null) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

async function releaseLock(): Promise<void> {
  stopHeartbeat();
  try {
    const l = (await chrome.storage.session.get(LOCK_KEY))[LOCK_KEY] as Lock | undefined;
    if (l?.owner === TAB_ID) await chrome.storage.session.remove(LOCK_KEY);
  } catch {
    /* ignore */
  }
}

// ---------- progress ----------

async function patch(p: Partial<Progress>): Promise<Progress | null> {
  const cur = await getProgress();
  if (!cur) return null;
  const next: Progress = { ...cur, ...p, updatedAt: iso() };
  // Re-read right before writing so a concurrent Pause (which sets `paused`
  // independently) is not clobbered by a stale `cur` (review M1).
  const latest = await getProgress();
  if (latest) {
    if (p.paused === undefined) next.paused = latest.paused;
    if (p.running === undefined) next.running = latest.running;
  }
  await setProgress(next);
  return next;
}

// ---------- the loop ----------

/** Scan a list of companies serially with throttle + retry. Returns count done. */
async function scanList(
  companies: Company[],
  run: RunConfig,
  cfg: DetectorConfig,
  hooks: RunHooks,
): Promise<number> {
  let completed = 0;
  for (const company of companies) {
    const p = await getProgress();
    if (!p || !p.running || p.paused) break;
    await heartbeat();
    await patch({ currentDomain: company.domain });

    const url = await resolve(company.domain, run.resolveViaReviewPage);
    let result = await scanOne(company, url, run, cfg);

    let attempts = 0;
    while ((result.loadStatus === 'timeout' || result.loadStatus === 'error') && attempts < run.maxRetries) {
      const pp = await getProgress();
      if (!pp || !pp.running || pp.paused) break;
      attempts++;
      await sleep(run.delayMs);
      result = await scanOne(company, url, run, cfg);
    }

    await saveResult(result);
    completed++;
    const np = await patch({ completed, currentDomain: null });
    if (np) hooks.onProgress(np, result);
    await sleep(run.delayMs);
  }
  return completed;
}

/** Start a scan run in one of three modes. */
export async function runScan(
  partial: Partial<RunConfig>,
  mode: RunMode,
  hooks: RunHooks,
): Promise<void> {
  if (await lockHeldByOther()) {
    hooks.onError?.('Đang có một lần quét chạy ở tab bảng điều khiển khác.');
    return;
  }

  const run: RunConfig = { ...DEFAULT_RUN_CONFIG, ...partial };
  if (mode === 'restart') await clearRun();
  await setRunConfig(run);
  startHeartbeat();

  await setProgress({
    running: true,
    paused: false,
    query: run.query,
    total: 0,
    completed: 0,
    currentDomain: null,
    updatedAt: iso(),
    error: null,
    mode, // persisted so resume re-derives the right work set (review H3)
  });
  hooks.onProgress((await getProgress())!);

  try {
    const cfg = await getEffectiveConfig();
    const byDomain = new Map((await getResults()).map((r) => [r.domain, r]));
    let toScan: Company[];
    if (mode === 'refreshStale') {
      toScan = pickStaleCompanies(await getCompanies(), byDomain, run.staleDays, Date.now());
    } else {
      // 'new' or 'restart': collect companies not already scanned (skip empty after restart)
      const skip = new Set(byDomain.keys());
      const fresh = await collect(run.query, run.limit, skip, run.delayMs);
      await saveCompanies(fresh);
      toScan = fresh;
    }

    const started = await patch({ total: toScan.length });
    if (started) hooks.onProgress(started);

    const completed = await scanList(toScan, run, cfg, hooks);

    const cur = await getProgress();
    if (cur?.paused) return; // paused mid-run — stay resumable, do not mark finished
    const fin = await patch({ running: false, currentDomain: null });
    if (fin) hooks.onProgress(fin);
    hooks.onDone?.({ completed, total: toScan.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Lỗi khi quét';
    const p = await patch({ running: false, error: msg });
    if (p) hooks.onProgress(p);
    hooks.onError?.(msg);
  } finally {
    await releaseLock(); // always release lock + stop heartbeat, even on error (review M2)
  }
}

/**
 * Resume an interrupted run when the dashboard is reopened (progress.running
 * left true because the tab was closed mid-run). Scans cached companies that
 * still have no result. Returns true if it resumed.
 */
export async function resumeIfInterrupted(hooks: RunHooks): Promise<boolean> {
  const p = await getProgress();
  if (!p || !p.running || p.paused) return false;
  if (await lockHeldByOther()) return false;

  const run = (await getRunConfig()) ?? DEFAULT_RUN_CONFIG;
  const mode: RunMode = p.mode ?? 'new';
  const byDomain = new Map((await getResults()).map((r) => [r.domain, r]));
  const companies = await getCompanies();
  // Re-derive the work set with the SAME mode as the original run, so a paused/
  // interrupted refreshStale run still re-scans its stale-but-scanned companies
  // instead of abandoning them (review H3).
  const remaining =
    mode === 'refreshStale'
      ? pickStaleCompanies(companies, byDomain, run.staleDays, Date.now())
      : pickUnscanned(companies, byDomain);

  if (remaining.length === 0) {
    const fin = await patch({ running: false, currentDomain: null });
    if (fin) hooks.onProgress(fin);
    return false;
  }

  startHeartbeat();
  try {
    const cfg = await getEffectiveConfig();
    const reset = await patch({ total: remaining.length, completed: 0, error: null });
    if (reset) hooks.onProgress(reset);

    const completed = await scanList(remaining, run, cfg, hooks);

    const cur = await getProgress();
    if (cur?.paused) return true; // paused again — stay resumable, don't finish (review H2)
    const fin = await patch({ running: false, currentDomain: null });
    if (fin) hooks.onProgress(fin);
    hooks.onDone?.({ completed, total: remaining.length });
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Lỗi khi quét';
    const pp = await patch({ running: false, error: msg });
    if (pp) hooks.onProgress(pp);
    hooks.onError?.(msg);
    return true;
  } finally {
    await releaseLock();
  }
}
