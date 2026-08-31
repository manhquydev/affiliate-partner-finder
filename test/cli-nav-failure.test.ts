import { describe, it, expect } from 'vitest';
import { classifyNavFailure } from '../cli/nav-failure';

describe('classifyNavFailure', () => {
  it('maps Playwright TimeoutError to timeout', () => {
    const err = new Error('Timeout 20000ms exceeded');
    err.name = 'TimeoutError';
    expect(classifyNavFailure(err)).toBe('timeout');
  });

  it('maps scan budget exceeded to timeout', () => {
    expect(classifyNavFailure(new Error('scanOne(mohd.it) exceeded 120000ms'))).toBe('timeout');
  });

  it('maps target-closed to dead (not timeout)', () => {
    expect(classifyNavFailure(new Error('Target closed'))).toBe('dead');
    expect(classifyNavFailure(new Error('browser has been closed'))).toBe('dead');
  });

  it('maps other goto throws to error (GOTO_TIMEOUT_EMPTY lock)', () => {
    expect(classifyNavFailure(new Error('net::ERR_ABORTED'))).toBe('error');
    expect(classifyNavFailure(new Error('NS_ERROR_FAILURE'))).toBe('error');
  });
});
