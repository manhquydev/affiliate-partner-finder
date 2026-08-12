import type { KetQuaCounts, ProgressSnapshot } from './types.ts';

export function formatProgress(p: ProgressSnapshot | null): string {
  if (!p) return 'Chưa có tiến độ';
  const pct = p.total > 0 ? Math.round((100 * p.completed) / p.total) : 0;
  return `${p.completed} / ${p.total} (${pct}%)`;
}

export function formatCounts(c: KetQuaCounts): string {
  return `true ${c.true} · false ${c.false} · unknown ${c.unknown}`;
}
