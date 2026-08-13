import { describe, expect, it } from 'vitest';
import {
  EtaTracker,
  estimateCompletion,
  extractScannedAtMsFromJsonlText,
  formatDurationVi,
  rateCompaniesPerHour,
  samplesFromScanTimestamps,
} from '../desktop/eta';

describe('desktop ETA', () => {
  it('formats relative durations in Vietnamese', () => {
    expect(formatDurationVi(30_000)).toBe('dưới 2 phút');
    expect(formatDurationVi(10 * 60_000)).toMatch(/10 phút/);
    expect(formatDurationVi(2.5 * 3_600_000)).toMatch(/2 giờ/);
  });

  it('computes rate over a window', () => {
    const t0 = 1_000_000;
    const samples = [
      { tsMs: t0, completed: 100 },
      { tsMs: t0 + 3_600_000, completed: 270 }, // +170/h
    ];
    const rate = rateCompaniesPerHour(samples, t0 + 3_600_000, 3_600_000, 60_000);
    expect(rate).toBeCloseTo(170, 0);
  });

  it('blends toward stable ETA (~170/h → ~26h for ~4500 remaining)', () => {
    const now = Date.parse('2026-08-13T00:00:00+07:00');
    const samples = [];
    // 3h of history @ ~170/h
    for (let m = 0; m <= 180; m += 2) {
      samples.push({
        tsMs: now - (180 - m) * 60_000,
        completed: 2500 + Math.round((m / 60) * 170),
      });
    }
    const completed = samples[samples.length - 1]!.completed;
    const eta = estimateCompletion({ samples, total: 7465, completed, nowMs: now });
    expect(eta.confidence).toMatch(/medium|high/);
    expect(eta.companiesPerHour).toBeGreaterThan(140);
    expect(eta.companiesPerHour).toBeLessThan(210);
    expect(eta.remainingMs).not.toBeNull();
    const hours = (eta.remainingMs ?? 0) / 3_600_000;
    expect(hours).toBeGreaterThan(20);
    expect(hours).toBeLessThan(40);
    expect(eta.relativeLabel).toMatch(/Còn/);
  });

  it('does not trust a 2-minute noisy spike alone as high confidence', () => {
    const now = 10_000_000;
    const samples = [
      { tsMs: now - 120_000, completed: 100 },
      { tsMs: now, completed: 106 }, // Δ6 / 2m = 180/h but short
    ];
    const eta = estimateCompletion({ samples, total: 1000, completed: 106, nowMs: now });
    expect(eta.confidence).toBe('low');
    expect(eta.companiesPerHour).toBeGreaterThan(0);
  });

  it('marks stalled when no increase for 8+ minutes', () => {
    const now = 20_000_000;
    const samples = [
      { tsMs: now - 20 * 60_000, completed: 50 },
      { tsMs: now - 10 * 60_000, completed: 80 },
      { tsMs: now - 9 * 60_000, completed: 80 },
      { tsMs: now, completed: 80 },
    ];
    const eta = estimateCompletion({ samples, total: 200, completed: 80, nowMs: now });
    expect(eta.stalled).toBe(true);
    expect(eta.relativeLabel).toMatch(/tạm dừng/);
  });

  it('aligns JSONL tail timestamps to absolute completed', () => {
    const base = Date.parse('2026-08-12T10:00:00Z');
    const times = Array.from({ length: 10 }, (_, i) => base + i * 60_000);
    const samples = samplesFromScanTimestamps(times, 500);
    expect(samples[0]!.completed).toBe(491);
    expect(samples[samples.length - 1]!.completed).toBe(500);
  });

  it('extracts scannedAt from jsonl text', () => {
    const text = [
      '{"domain":"a.com","scannedAt":"2026-08-12T10:00:00.000Z"}',
      'not-json',
      '{"domain":"b.com","scannedAt":"2026-08-12T10:05:00.000Z"}',
    ].join('\n');
    const times = extractScannedAtMsFromJsonlText(text);
    expect(times).toHaveLength(2);
  });

  it('EtaTracker seeds once then observes live progress', () => {
    const tracker = new EtaTracker();
    tracker.begin('/tmp/job-a');
    const t0 = 5_000_000;
    tracker.seed([
      { tsMs: t0 - 3_600_000, completed: 100 },
      { tsMs: t0 - 1_800_000, completed: 185 },
      { tsMs: t0, completed: 270 },
    ]);
    const eta = tracker.observe({ completed: 272, total: 1000, nowMs: t0 + 60_000 });
    expect(eta.companiesPerHour).toBeGreaterThan(100);
    expect(eta.relativeLabel).toMatch(/Còn|đang đo|tạm/);
  });
});
