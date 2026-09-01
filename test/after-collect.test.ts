import { describe, expect, it } from 'vitest';
import { afterCollectAction } from '../lib/after-collect';

describe('afterCollectAction', () => {
  it('exits 130 when count is 0 and stop was requested', () => {
    expect(
      afterCollectAction({ collectOnly: false, stopRequested: true, count: 0 }),
    ).toEqual({ kind: 'exit', code: 130 });
  });

  it('exits 1 when count is 0 and stop was not requested', () => {
    expect(
      afterCollectAction({ collectOnly: false, stopRequested: false, count: 0 }),
    ).toEqual({ kind: 'exit', code: 1 });
  });

  it('exits 130 when collect-only with a partial list and stop', () => {
    expect(
      afterCollectAction({ collectOnly: true, stopRequested: true, count: 3 }),
    ).toEqual({ kind: 'exit', code: 130 });
  });

  it('exits 0 when collect-only completes with companies', () => {
    expect(
      afterCollectAction({ collectOnly: true, stopRequested: false, count: 3 }),
    ).toEqual({ kind: 'exit', code: 0 });
  });

  it('scans when not collect-only and count > 0', () => {
    expect(
      afterCollectAction({ collectOnly: false, stopRequested: false, count: 3 }),
    ).toEqual({ kind: 'scan' });
    expect(
      afterCollectAction({ collectOnly: false, stopRequested: true, count: 3 }),
    ).toEqual({ kind: 'scan' });
  });
});
