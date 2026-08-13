/**
 * Rolling ETA for desktop jobs — multi-window rate blend + optional JSONL bootstrap.
 * Short windows alone are noisy; medium (~20m) + session baseline stay closer to reality.
 */

export type ProgressSample = {
  tsMs: number;
  completed: number;
};

export type EtaConfidence = 'none' | 'low' | 'medium' | 'high';

export type EtaSnapshot = {
  remainingMs: number | null;
  finishAtMs: number | null;
  companiesPerHour: number | null;
  confidence: EtaConfidence;
  stalled: boolean;
  /** Vietnamese relative line for UI */
  relativeLabel: string;
  /** Short rate line e.g. "~169/h" */
  rateLabel: string;
};

const MAX_SAMPLES = 400;
const MAX_AGE_MS = 3 * 60 * 60 * 1000;
const STALL_MS = 8 * 60 * 1000;
const MIN_SPAN_RECENT_MS = 90_000;
const MIN_SPAN_MEDIUM_MS = 4 * 60_000;
const WINDOW_RECENT_MS = 8 * 60_000;
const WINDOW_MEDIUM_MS = 25 * 60_000;
/** Below this rate, ETA is noise (multi-year finishes) — refuse confidence. */
const MIN_USABLE_RATE_PER_HOUR = 2;

export function emptyEta(message = 'ETA: đang đo tốc độ…'): EtaSnapshot {
  return {
    remainingMs: null,
    finishAtMs: null,
    companiesPerHour: null,
    confidence: 'none',
    stalled: false,
    relativeLabel: message,
    rateLabel: '',
  };
}

/** Rate (companies/hour) between first sample at/before window start and latest. */
export function rateCompaniesPerHour(
  samples: ProgressSample[],
  nowMs: number,
  windowMs: number,
  minSpanMs: number,
): number | null {
  if (samples.length < 2) return null;
  const cutoff = nowMs - windowMs;
  let start = samples[0]!;
  for (const s of samples) {
    if (s.tsMs <= cutoff) start = s;
    else break;
  }
  const end = samples[samples.length - 1]!;
  const dt = end.tsMs - start.tsMs;
  const d = end.completed - start.completed;
  if (dt < minSpanMs || d <= 0) return null;
  return (d / dt) * 3_600_000;
}

function blendRates(recent: number | null, medium: number | null, session: number | null): {
  rate: number | null;
  confidence: EtaConfidence;
} {
  if (medium != null && session != null && recent != null) {
    return {
      rate: medium * 0.55 + session * 0.3 + recent * 0.15,
      confidence: 'high',
    };
  }
  if (medium != null && session != null) {
    return { rate: medium * 0.7 + session * 0.3, confidence: 'high' };
  }
  if (medium != null && recent != null) {
    return { rate: medium * 0.75 + recent * 0.25, confidence: 'medium' };
  }
  if (medium != null) return { rate: medium, confidence: 'medium' };
  if (session != null && recent != null) {
    return { rate: session * 0.6 + recent * 0.4, confidence: 'medium' };
  }
  if (session != null) return { rate: session, confidence: 'low' };
  if (recent != null) return { rate: recent, confidence: 'low' };
  return { rate: null, confidence: 'none' };
}

export function formatDurationVi(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 90_000) return 'dưới 2 phút';
  const totalMin = Math.round(ms / 60_000);
  if (totalMin < 60) return `~${totalMin} phút`;
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;
  if (days > 0) {
    if (hours > 0) return `~${days} ngày ${hours} giờ`;
    return `~${days} ngày`;
  }
  if (mins >= 5) return `~${hours} giờ ${mins} phút`;
  return `~${hours} giờ`;
}

export function formatFinishClock(finishAtMs: number, nowMs = Date.now()): string {
  const d = new Date(finishAtMs);
  const sameDay =
    d.getFullYear() === new Date(nowMs).getFullYear() &&
    d.getMonth() === new Date(nowMs).getMonth() &&
    d.getDate() === new Date(nowMs).getDate();
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `hôm nay ${time}`;
  const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  return `${date} ${time}`;
}

export function estimateCompletion(input: {
  samples: ProgressSample[];
  total: number;
  completed: number;
  nowMs?: number;
}): EtaSnapshot {
  const nowMs = input.nowMs ?? Date.now();
  const { total, completed } = input;
  const remaining = Math.max(0, total - completed);

  if (total <= 0) return emptyEta('ETA: chờ tổng số công ty');
  if (remaining === 0) {
    return {
      remainingMs: 0,
      finishAtMs: nowMs,
      companiesPerHour: null,
      confidence: 'high',
      stalled: false,
      relativeLabel: 'Đã đủ tiến độ — đang hoàn tất xuất file…',
      rateLabel: '',
    };
  }

  const samples = input.samples.filter((s) => s.tsMs <= nowMs + 1000);
  if (samples.length === 0) return emptyEta();

  let lastIncreaseTs = samples[0]!.tsMs;
  for (let i = 1; i < samples.length; i++) {
    if (samples[i]!.completed > samples[i - 1]!.completed) lastIncreaseTs = samples[i]!.tsMs;
  }
  const stalled = nowMs - lastIncreaseTs >= STALL_MS && completed < total;

  const recent = rateCompaniesPerHour(samples, nowMs, WINDOW_RECENT_MS, MIN_SPAN_RECENT_MS);
  const medium = rateCompaniesPerHour(samples, nowMs, WINDOW_MEDIUM_MS, MIN_SPAN_MEDIUM_MS);
  const sessionSpan = samples[samples.length - 1]!.tsMs - samples[0]!.tsMs;
  const session =
    sessionSpan >= MIN_SPAN_RECENT_MS
      ? rateCompaniesPerHour(samples, nowMs, MAX_AGE_MS, MIN_SPAN_RECENT_MS)
      : null;

  const { rate, confidence: rawConfidence } = blendRates(recent, medium, session);
  const observedSpan = samples[samples.length - 1]!.tsMs - samples[0]!.tsMs;
  let confidence = rawConfidence;
  if (observedSpan < MIN_SPAN_MEDIUM_MS && confidence === 'medium') confidence = 'low';
  if (observedSpan < 15 * 60_000 && confidence === 'high') confidence = 'medium';
  if (observedSpan < MIN_SPAN_RECENT_MS) confidence = 'none';

  if (stalled) {
    return {
      remainingMs: null,
      finishAtMs: null,
      companiesPerHour: rate,
      confidence: 'none',
      stalled: true,
      relativeLabel: 'Tiến độ tạm dừng (>8 phút) — ETA tạm ẩn, kiểm tra Chrome/CF',
      rateLabel: rate != null ? `trước đó ~${Math.round(rate)}/h` : '',
    };
  }

  if (rate == null || rate <= 0 || confidence === 'none') {
    return emptyEta('ETA: cần thêm vài phút tiến độ để ước tính');
  }
  if (rate < MIN_USABLE_RATE_PER_HOUR) {
    return emptyEta('ETA: tốc độ quá thấp để ước tính tin cậy');
  }

  const remainingMs = (remaining / rate) * 3_600_000;
  const finishAtMs = nowMs + remainingMs;
  const confNote =
    confidence === 'low' ? ' (ước tính sơ bộ)' : confidence === 'medium' ? '' : '';

  return {
    remainingMs,
    finishAtMs,
    companiesPerHour: rate,
    confidence,
    stalled: false,
    relativeLabel: `Còn ${formatDurationVi(remainingMs)} · xong khoảng ${formatFinishClock(finishAtMs, nowMs)}${confNote}`,
    rateLabel: `~${Math.round(rate)} công ty/giờ`,
  };
}

/**
 * Build samples from scannedAt timestamps.
 * `absoluteCompleted` = job completed count at the newest timestamp (aligns JSONL tail to progress.json).
 */
export function samplesFromScanTimestamps(
  timestampsMs: number[],
  absoluteCompleted?: number,
): ProgressSample[] {
  const sorted = [...timestampsMs].filter((t) => Number.isFinite(t) && t > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return [];
  const n = sorted.length;
  const endCompleted =
    absoluteCompleted != null && absoluteCompleted >= n ? absoluteCompleted : n;
  const offset = endCompleted - n;

  // Downsample dense tails: keep ~every 45s + endpoints
  const out: ProgressSample[] = [];
  let lastKept = -Infinity;
  for (let i = 0; i < n; i++) {
    const t = sorted[i]!;
    const isEdge = i === 0 || i === n - 1;
    if (isEdge || t - lastKept >= 45_000) {
      out.push({ tsMs: t, completed: offset + i + 1 });
      lastKept = t;
    }
  }
  return out;
}

/** Parse scannedAt from a JSONL text blob (typically a file tail). */
export function extractScannedAtMsFromJsonlText(text: string): number[] {
  const times: number[] = [];
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t[0] !== '{') continue;
    try {
      const row = JSON.parse(t) as { scannedAt?: string };
      if (typeof row.scannedAt === 'string') {
        const ms = Date.parse(row.scannedAt);
        if (Number.isFinite(ms)) times.push(ms);
      }
    } catch {
      /* skip truncated / corrupt */
    }
  }
  return times;
}

export class EtaTracker {
  private samples: ProgressSample[] = [];
  private outKey = '';
  private seeded = false;

  reset(): void {
    this.samples = [];
    this.seeded = false;
  }

  /** Call when starting a new job (fresh or resume). */
  begin(outKey: string): void {
    if (outKey !== this.outKey) {
      this.outKey = outKey;
      this.reset();
    }
  }

  getSamples(): readonly ProgressSample[] {
    return this.samples;
  }

  push(completed: number, nowMs = Date.now()): void {
    const last = this.samples[this.samples.length - 1];
    // Debounce identical completed within 2s; still sample periodically for stall clock
    if (last && last.completed === completed && nowMs - last.tsMs < 2_000) {
      return;
    }
    this.samples.push({ tsMs: nowMs, completed });
    this.prune(nowMs);
  }

  /** Merge historical samples once (e.g. from results.jsonl tail). */
  seed(historical: ProgressSample[]): void {
    if (this.seeded || historical.length < 2) return;
    this.seeded = true;
    const merged = [...historical, ...this.samples].sort((a, b) => a.tsMs - b.tsMs || a.completed - b.completed);
    this.samples = merged;
    this.prune(Date.now());
  }

  observe(input: { completed: number; total: number; nowMs?: number }): EtaSnapshot {
    const nowMs = input.nowMs ?? Date.now();
    this.push(input.completed, nowMs);
    return estimateCompletion({
      samples: this.samples,
      total: input.total,
      completed: input.completed,
      nowMs,
    });
  }

  private prune(nowMs: number): void {
    const cutoff = nowMs - MAX_AGE_MS;
    while (this.samples.length > 2 && this.samples[0]!.tsMs < cutoff) {
      this.samples.shift();
    }
    if (this.samples.length > MAX_SAMPLES) {
      this.samples = this.samples.slice(-MAX_SAMPLES);
    }
  }
}
