// Background service worker — the orchestrator (docs/04 §1-4).
// Drives Collect → Resolve → throttled Scan queue (1 tab at a time), persists to
// IndexedDB after every company, and survives SW termination via chrome.alarms.

import { collect } from '../lib/collect';
import { resolve } from '../lib/resolve';
import { scanOne } from '../lib/scan';
import { DEFAULT_RUN_CONFIG } from '../lib/config';
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
} from '../lib/storage';
import type { PopupToBg, ProgressEvent, StateReply } from '../lib/messages';
import type { Progress, RunConfig, ScanResult } from '../lib/types';

const ALARM_NAME = 'resume-queue';
// Chrome clamps alarm periods to a 30s minimum; 0.5min is the smallest honored.
const ALARM_PERIOD_MIN = 0.5;

/** In-memory guard so only one queue loop runs at a time (1 scan tab — NFR-01). */
let loopRunning = false;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function now() {
  return new Date().toISOString();
}

function broadcast(progress: Progress, result?: ScanResult) {
  const msg: ProgressEvent = { type: 'PROGRESS', progress, result };
  // No listener (popup closed) rejects the promise — ignore.
  chrome.runtime.sendMessage(msg).catch(() => {});
}

async function patchProgress(patch: Partial<Progress>): Promise<Progress | null> {
  const current = await getProgress();
  if (!current) return null;
  const next: Progress = { ...current, ...patch, updatedAt: now() };
  await setProgress(next);
  return next;
}

export default defineBackground(() => {
  // Ensure the recovery alarm exists across installs/startups.
  chrome.runtime.onInstalled.addListener(ensureAlarm);
  chrome.runtime.onStartup.addListener(ensureAlarm);
  ensureAlarm();

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) void resumeIfNeeded();
  });

  chrome.runtime.onMessage.addListener((msg: PopupToBg, _sender, sendResponse) => {
    switch (msg.type) {
      case 'START':
        void startRun(msg.run);
        return false;
      case 'PAUSE':
        void patchProgress({ paused: true }).then((p) => p && broadcast(p));
        return false;
      case 'RESUME':
        void (async () => {
          const p = await patchProgress({ paused: false, running: true });
          if (p) broadcast(p);
          void runQueue();
        })();
        return false;
      case 'CLEAR':
        void clearRun();
        return false;
      case 'GET_STATE':
        void (async () => {
          const reply: StateReply = {
            progress: await getProgress(),
            results: await getResults(),
          };
          sendResponse(reply);
        })();
        return true; // async response
      default:
        return false;
    }
  });
});

function ensureAlarm() {
  chrome.alarms.get(ALARM_NAME, (a) => {
    if (!a) chrome.alarms.create(ALARM_NAME, { periodInMinutes: ALARM_PERIOD_MIN });
  });
}

/** Fresh run: reset, collect, then start the scan queue. */
async function startRun(partial: Partial<RunConfig>) {
  // Reject a new run while one is active (the popup also disables Start, but the
  // background must not clear/collect over a live loop — M2). Resume via RESUME.
  const existing = await getProgress();
  if (loopRunning || existing?.running) return;

  const run: RunConfig = { ...DEFAULT_RUN_CONFIG, ...partial };
  await clearRun();
  await setRunConfig(run);

  await setProgress({
    running: true,
    paused: false,
    query: run.query,
    total: 0,
    completed: 0,
    currentDomain: null,
    updatedAt: now(),
    error: null,
  });
  broadcast((await getProgress())!);

  let companies;
  try {
    companies = await collect(run.query, run.limit);
  } catch (e) {
    const p = await patchProgress({
      running: false,
      error: e instanceof Error ? e.message : 'Collect failed',
    });
    if (p) broadcast(p);
    return;
  }

  await saveCompanies(companies);
  const p = await patchProgress({ total: companies.length });
  if (p) broadcast(p);

  await runQueue();
}

/** Serial, throttled scan loop. Resumable — reads all state from IndexedDB. */
async function runQueue() {
  if (loopRunning) return;
  loopRunning = true;
  try {
    const run = await getRunConfig();
    if (!run) return;

    const companies = await getCompanies();
    const done = new Set((await getResults()).map((r) => r.domain));

    for (const company of companies) {
      const progress = await getProgress();
      if (!progress || !progress.running || progress.paused) break;
      if (done.has(company.domain)) continue;

      await patchProgress({ currentDomain: company.domain });

      const websiteUrl = await resolve(company.domain, run.resolveViaReviewPage);
      let result = await scanOne(company, websiteUrl, run);

      // Retry only transient failures (timeout/error) — never blocked (docs/08 §6).
      let attempts = 0;
      while (
        (result.loadStatus === 'timeout' || result.loadStatus === 'error') &&
        attempts < run.maxRetries
      ) {
        // Stop retrying if the user paused/stopped mid-retry (L4).
        const pr = await getProgress();
        if (!pr || !pr.running || pr.paused) break;
        attempts++;
        await sleep(run.delayMs);
        result = await scanOne(company, websiteUrl, run);
      }

      await saveResult(result);
      done.add(company.domain);

      const p = await patchProgress({ completed: done.size, currentDomain: null });
      if (p) broadcast(p, result);

      await sleep(run.delayMs); // throttle between companies (NFR-01)
    }

    // Mark finished when everything is scanned.
    const final = await getProgress();
    if (final && final.completed >= final.total && final.total > 0) {
      const p = await patchProgress({ running: false, currentDomain: null });
      if (p) broadcast(p);
    }
  } finally {
    loopRunning = false;
  }
}

/** Alarm-driven recovery: resume an interrupted run after SW termination. */
async function resumeIfNeeded() {
  if (loopRunning) return;
  const progress = await getProgress();
  if (progress && progress.running && !progress.paused) {
    await runQueue();
  }
}
