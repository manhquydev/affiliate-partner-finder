import { describe, it, expect } from 'vitest';
import {
  VERDICT_LABEL,
  CONFIDENCE_LABEL,
  LOAD_STATUS_LABEL,
  VERDICT_LEGEND,
} from '../lib/labels';
import type { Verdict, Confidence, LoadStatus } from '../lib/types';

const VERDICTS: Verdict[] = ['affiliate', 'partner_trade', 'none', 'unknown'];
const CONFIDENCES: Confidence[] = ['high', 'medium', 'low', 'blocked'];
const LOAD_STATUSES: LoadStatus[] = ['ok', 'blocked', 'timeout', 'error'];

describe('labels — completeness (no missing Vietnamese label)', () => {
  it('covers every verdict', () => {
    for (const v of VERDICTS) {
      expect(VERDICT_LABEL[v]).toBeTruthy();
      expect(VERDICT_LEGEND[v].meaning).toBeTruthy();
      expect(VERDICT_LEGEND[v].action).toBeTruthy();
    }
  });
  it('covers every confidence + loadStatus', () => {
    for (const c of CONFIDENCES) expect(CONFIDENCE_LABEL[c]).toBeTruthy();
    for (const s of LOAD_STATUSES) expect(LOAD_STATUS_LABEL[s]).toBeTruthy();
  });
  it('unknown legend warns that blocked is NOT "none"', () => {
    expect(VERDICT_LEGEND.unknown.meaning.toLowerCase()).toContain('không phải');
  });
});
