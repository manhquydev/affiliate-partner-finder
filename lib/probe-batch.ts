/** Clamp CLI --probe-batch-size to ethics-friendly 1..3. */
export function clampProbeBatchSize(raw: number | undefined, fallback = 3): number {
  const n = raw == null || !Number.isFinite(raw) ? fallback : Math.trunc(raw);
  return Math.min(3, Math.max(1, n));
}
