/** First-wave start stagger only — not index × delay over the whole pending set. */

export function firstWaveStaggerMs(index: number, concurrency: number, delayMs: number): number {
  const gap = Math.min(Math.max(0, delayMs), 500);
  const conc = Math.max(1, Math.trunc(concurrency) || 1);
  if (index < 0 || index >= conc) return 0;
  return index * gap;
}
