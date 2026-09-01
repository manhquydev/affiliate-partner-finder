export type AfterCollectAction =
  | { kind: 'scan' }
  | { kind: 'exit'; code: 0 | 1 | 130 };

export function afterCollectAction(opts: {
  collectOnly: boolean;
  stopRequested: boolean;
  count: number;
}): AfterCollectAction {
  const { collectOnly, stopRequested, count } = opts;
  if (count <= 0) {
    return { kind: 'exit', code: stopRequested ? 130 : 1 };
  }
  if (collectOnly) {
    return { kind: 'exit', code: stopRequested ? 130 : 0 };
  }
  return { kind: 'scan' };
}
