import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LAZY_SETTLE_BUDGET_MS,
  DEFAULT_SETTLE_MS,
  resolveLazySettleBudgetMs,
} from '../cli/browser';

describe('lazy settle budget (phase-03 locks)', () => {
  it('defaults to ≤1200ms hard cap', () => {
    expect(DEFAULT_LAZY_SETTLE_BUDGET_MS).toBe(1200);
    expect(DEFAULT_SETTLE_MS).toBe(1200);
    expect(resolveLazySettleBudgetMs()).toBe(1200);
  });

  it('clamps requested budget to max 1200ms (A7 > A6)', () => {
    expect(resolveLazySettleBudgetMs(2000)).toBe(1200);
    expect(resolveLazySettleBudgetMs(1500)).toBe(1200);
    expect(resolveLazySettleBudgetMs(800)).toBe(800);
  });

  it('never exceeds remaining scan budget', () => {
    expect(resolveLazySettleBudgetMs(1200, 400)).toBe(400);
    expect(resolveLazySettleBudgetMs(1200, 0)).toBe(0);
    expect(resolveLazySettleBudgetMs(500, 900)).toBe(500);
  });

  it('treats invalid / negative as zero or default safely', () => {
    expect(resolveLazySettleBudgetMs(-10)).toBe(0);
    expect(resolveLazySettleBudgetMs(Number.NaN)).toBe(1200);
    expect(resolveLazySettleBudgetMs(1200, -5)).toBe(0);
  });
});
