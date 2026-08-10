// User-editable detector config (NFR-05). Overrides for the keyword/platform/
// path lists are stored in chrome.storage.local — NOT IndexedDB — so they
// survive "Quét lại từ đầu" (which clears the idb run data). An empty list falls
// back to the built-in default, so a blank textarea can never disable detection.

import { CONFIG } from './config';
import type { DetectorConfig } from './types';

const KEY = 'detectorConfigOverride';

export type ConfigOverride = Partial<Pick<DetectorConfig, 'strong' | 'weak' | 'platforms' | 'paths'>>;

export async function getConfigOverride(): Promise<ConfigOverride | null> {
  try {
    return ((await chrome.storage.local.get(KEY))[KEY] as ConfigOverride) ?? null;
  } catch {
    return null;
  }
}

export async function setConfigOverride(o: ConfigOverride): Promise<void> {
  await chrome.storage.local.set({ [KEY]: o });
}

export async function clearConfigOverride(): Promise<void> {
  await chrome.storage.local.remove(KEY);
}

/** Merge an override onto the built-in CONFIG; empty arrays fall back to default. */
export function mergeConfig(o: ConfigOverride | null): DetectorConfig {
  if (!o) return CONFIG;
  return {
    strong: o.strong && o.strong.length ? o.strong : CONFIG.strong,
    weak: o.weak && o.weak.length ? o.weak : CONFIG.weak,
    platforms: o.platforms && o.platforms.length ? o.platforms : CONFIG.platforms,
    paths: o.paths && o.paths.length ? o.paths : CONFIG.paths,
    detectorVersion: CONFIG.detectorVersion,
  };
}

/** The config a scan should actually use (default + any saved override). */
export async function getEffectiveConfig(): Promise<DetectorConfig> {
  return mergeConfig(await getConfigOverride());
}
