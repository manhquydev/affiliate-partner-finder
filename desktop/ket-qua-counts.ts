import { createReadStream, existsSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { simpleHit, toSimpleCSV } from '../lib/export';
import type { ScanResult } from '../lib/types';
import type { KetQuaCounts } from './types';

export function emptyCounts(): KetQuaCounts {
  return { true: 0, false: 0, unknown: 0 };
}

/** Parse complete JSONL lines; skip corrupt / truncated last line. */
export async function countKetQuaFromJsonl(jsonlPath: string): Promise<KetQuaCounts> {
  const counts = emptyCounts();
  if (!existsSync(jsonlPath)) return counts;

  const rl = createInterface({
    input: createReadStream(jsonlPath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  const byDomain = new Map<string, ScanResult>();
  for await (const line of rl) {
    const t = line.trim();
    if (!t) continue;
    try {
      const row = JSON.parse(t) as ScanResult;
      if (!row?.domain || typeof row.loadStatus !== 'string') continue;
      byDomain.set(row.domain, row);
    } catch {
      // truncated or corrupt line — skip
    }
  }
  for (const row of byDomain.values()) {
    counts[simpleHit(row)] += 1;
  }
  return counts;
}

export async function loadResultsFromJsonl(jsonlPath: string): Promise<ScanResult[]> {
  const out: ScanResult[] = [];
  if (!existsSync(jsonlPath)) return out;
  const rl = createInterface({
    input: createReadStream(jsonlPath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  const byDomain = new Map<string, ScanResult>();
  for await (const line of rl) {
    const t = line.trim();
    if (!t) continue;
    try {
      const row = JSON.parse(t) as ScanResult;
      if (row?.domain) byDomain.set(row.domain, row);
    } catch {
      /* skip */
    }
  }
  return [...byDomain.values()];
}

/** Write end-user CSV from jsonl (used after Stop when CLI may not have exported). */
export async function writeSimpleCsvFromJsonl(outDir: string): Promise<string> {
  const jsonlPath = join(outDir, 'results.jsonl');
  const csvPath = join(outDir, 'results.csv');
  const results = await loadResultsFromJsonl(jsonlPath);
  writeFileSync(csvPath, toSimpleCSV(results));
  return csvPath;
}

/** Parse `[cli] scan domain → url` / `[cli] done domain` from stdout. */
export function parseCliStatusLine(line: string): { kind: 'scan' | 'done'; domain: string } | null {
  const scan = line.match(/\[cli\] scan (\S+)/);
  if (scan) return { kind: 'scan', domain: scan[1]! };
  const done = line.match(/\[cli\] done (\S+)/);
  if (done) return { kind: 'done', domain: done[1]! };
  return null;
}
