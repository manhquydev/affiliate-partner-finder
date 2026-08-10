// IndexedDB persistence (docs/04 §6): survive popup close and MV3 service-worker
// termination so a run can resume. Uses idb for a thin typed wrapper.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Company, ScanResult, Progress, RunConfig } from './types';

interface FinderDB extends DBSchema {
  companies: { key: string; value: Company };
  results: { key: string; value: ScanResult };
  // small singletons keyed by a fixed string
  meta: { key: string; value: unknown };
}

const DB_NAME = 'affiliate-finder';
const DB_VERSION = 1;
const PROGRESS_KEY = 'progress';
const RUNCONFIG_KEY = 'runConfig';

let dbPromise: Promise<IDBPDatabase<FinderDB>> | null = null;

function db(): Promise<IDBPDatabase<FinderDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FinderDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        database.createObjectStore('companies', { keyPath: 'domain' });
        database.createObjectStore('results', { keyPath: 'domain' });
        database.createObjectStore('meta');
      },
    });
  }
  return dbPromise;
}

// --- companies ---
export async function saveCompanies(companies: Company[]): Promise<void> {
  const d = await db();
  const tx = d.transaction('companies', 'readwrite');
  await Promise.all(companies.map((c) => tx.store.put(c)));
  await tx.done;
}

export async function getCompanies(): Promise<Company[]> {
  return (await db()).getAll('companies');
}

// --- results ---
export async function saveResult(result: ScanResult): Promise<void> {
  await (await db()).put('results', result);
}

export async function getResults(): Promise<ScanResult[]> {
  return (await db()).getAll('results');
}

// --- progress ---
export async function setProgress(progress: Progress): Promise<void> {
  await (await db()).put('meta', progress, PROGRESS_KEY);
}

export async function getProgress(): Promise<Progress | null> {
  return ((await (await db()).get('meta', PROGRESS_KEY)) as Progress) ?? null;
}

// --- run config ---
export async function setRunConfig(cfg: RunConfig): Promise<void> {
  await (await db()).put('meta', cfg, RUNCONFIG_KEY);
}

export async function getRunConfig(): Promise<RunConfig | null> {
  return ((await (await db()).get('meta', RUNCONFIG_KEY)) as RunConfig) ?? null;
}

// --- reset ---
export async function clearRun(): Promise<void> {
  const d = await db();
  const tx = d.transaction(['companies', 'results', 'meta'], 'readwrite');
  await Promise.all([
    tx.objectStore('companies').clear(),
    tx.objectStore('results').clear(),
    tx.objectStore('meta').clear(),
  ]);
  await tx.done;
}
