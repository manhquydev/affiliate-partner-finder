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

/** End-user triage: true if any affiliate OR partner signal; unknown if page unusable. */
export type SimpleHit = 'true' | 'false' | 'unknown';

export function simpleHit(r: ScanResult): SimpleHit {
  if (r.loadStatus !== 'ok') return 'unknown';
  const { linkHits, platformHits, pathHits } = r.evidence;
  if ((linkHits?.length ?? 0) > 0 || (platformHits?.length ?? 0) > 0 || (pathHits?.length ?? 0) > 0) {
    return 'true';
  }
  return 'false';
}

/** Short human hint — not technical diagnostics. */
export function simpleHint(r: ScanResult): string {
  const hit = simpleHit(r);
  if (hit === 'unknown') {
    return 'Không mở được trang — mở website thủ công để kiểm tra';
  }
  if (hit === 'false') {
    return 'Không thấy dấu hiệu affiliate/partner trên trang đã quét';
  }
  const kws = new Set<string>();
  for (const h of r.evidence.linkHits ?? []) {
    for (const k of h.kw ?? []) kws.add(k);
    for (const p of h.platform ?? []) kws.add(p);
  }
  for (const p of r.evidence.platformHits ?? []) kws.add(p);
  for (const h of r.evidence.pathHits ?? []) {
    if (h.path) kws.add(h.path);
  }
  const list = [...kws].slice(0, 8).join(', ');
  return list ? `Có dấu hiệu — gợi ý: ${list}` : 'Có dấu hiệu affiliate/partner — cần người xác nhận';
}

/** CSV cho người dùng cuối: không kèm thông số kỹ thuật (confidence, loadStatus, method…). */
const SIMPLE_CSV_COLUMNS = ['ten_cong_ty', 'website', 'ket_qua', 'huong_dan'] as const;

export function toSimpleCSV(results: ScanResult[]): string {
  const header = SIMPLE_CSV_COLUMNS.join(',');
  const rows = results.map((r) => {
    const record: Record<(typeof SIMPLE_CSV_COLUMNS)[number], unknown> = {
      ten_cong_ty: r.name || r.domain,
      website: r.websiteUrl || r.finalUrl || '',
      ket_qua: simpleHit(r),
      huong_dan: simpleHint(r),
    };
    return SIMPLE_CSV_COLUMNS.map((c) => csvCell(record[c])).join(',');
  });
  return [header, ...rows].join('\n');
}

