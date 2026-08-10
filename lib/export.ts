// Export (docs/06 §4-5). CSV columns are fixed by the schema; JSON is the full
// ScanResult[] for audit/re-processing. Every `affiliate` row must carry a
// reachable evidenceUrl (acceptance criterion).

import type { ScanResult } from './types';

export interface StrongestEvidence {
  url: string;
  text: string;
  method: 'link' | 'platform' | 'path' | '';
}

/** Pick the single strongest, openable piece of evidence for a result.
 * Guarantees a non-empty url for any result with a hit by falling back to the
 * page finalUrl (a strong keyword can match anchor TEXT while href is empty). */
export function strongestEvidence(r: ScanResult): StrongestEvidence {
  const { linkHits, pathHits } = r.evidence;

  // Prefer a strong link that actually has an href; then any strong link.
  const strongLink =
    linkHits.find((h) => h.isStrong && h.href) ?? linkHits.find((h) => h.isStrong);
  if (strongLink) {
    return {
      url: strongLink.href || r.finalUrl,
      text: strongLink.text || strongLink.kw.join(', '),
      method: strongLink.platform.length ? 'platform' : 'link',
    };
  }

  const strongPath = pathHits.find((h) => h.isStrong);
  if (strongPath) {
    return { url: strongPath.finalUrl || strongPath.path, text: strongPath.path, method: 'path' };
  }

  const weakLink = linkHits[0];
  if (weakLink) {
    return { url: weakLink.href || r.finalUrl, text: weakLink.text || weakLink.kw.join(', '), method: 'link' };
  }

  const weakPath = pathHits[0];
  if (weakPath) {
    return { url: weakPath.finalUrl || weakPath.path, text: weakPath.path, method: 'path' };
  }

  return { url: '', text: '', method: '' };
}

const CSV_COLUMNS = [
  'domain',
  'website',
  'finalUrl',
  'verdict',
  'confidence',
  'loadStatus',
  'evidenceUrl',
  'evidenceText',
  'method',
  'trustScore',
  'reviews',
  'scannedAt',
] as const;

/** Escape a CSV cell and neutralize spreadsheet formula injection. */
function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  // Formula-injection guard (=, +, -, @, tab, CR at start).
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCSV(results: ScanResult[]): string {
  const header = CSV_COLUMNS.join(',');
  const rows = results.map((r) => {
    const ev = strongestEvidence(r);
    const record: Record<(typeof CSV_COLUMNS)[number], unknown> = {
      domain: r.domain,
      website: r.websiteUrl,
      finalUrl: r.finalUrl,
      verdict: r.verdict,
      confidence: r.confidence,
      loadStatus: r.loadStatus,
      evidenceUrl: ev.url,
      evidenceText: ev.text,
      method: ev.method,
      trustScore: r.trustScore ?? '',
      reviews: r.reviews ?? '',
      scannedAt: r.scannedAt,
    };
    return CSV_COLUMNS.map((c) => csvCell(record[c])).join(',');
  });
  return [header, ...rows].join('\n');
}

export function toJSON(results: ScanResult[]): string {
  return JSON.stringify(results, null, 2);
}
