import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildXvfbChildArgs, isUnderVirtualDisplay, XVFB_MARKER } from '../cli/virtual-display';

describe('virtual-display', () => {
  const prev = process.env[XVFB_MARKER];

  beforeEach(() => {
    delete process.env[XVFB_MARKER];
  });

  afterEach(() => {
    if (prev === undefined) delete process.env[XVFB_MARKER];
    else process.env[XVFB_MARKER] = prev;
  });

  it('isUnderVirtualDisplay follows marker env', () => {
    expect(isUnderVirtualDisplay()).toBe(false);
    process.env[XVFB_MARKER] = '1';
    expect(isUnderVirtualDisplay()).toBe(true);
  });

  it('buildXvfbChildArgs forwards Node execArgv (tsx loader) before script path', () => {
    const args = buildXvfbChildArgs({
      execPath: '/usr/bin/node',
      execArgv: ['--require', '/path/preflight.cjs', '--import', 'file:///path/loader.mjs'],
      argv: ['/usr/bin/node', 'cli/index.ts', '--resume', '--virtual-display', '--out', './out/x'],
    });
    expect(args[0]).toBe('-a');
    expect(args[1]).toMatch(/^--server-args=/);
    expect(args.slice(2)).toEqual([
      '/usr/bin/node',
      '--require',
      '/path/preflight.cjs',
      '--import',
      'file:///path/loader.mjs',
      'cli/index.ts',
      '--resume',
      '--virtual-display',
      '--out',
      './out/x',
    ]);
  });

  it('buildXvfbChildArgs without execArgv still places node then script', () => {
    const args = buildXvfbChildArgs({
      execPath: '/usr/bin/node',
      execArgv: [],
      argv: ['/usr/bin/node', 'cli/index.ts', '--help'],
    });
    expect(args.slice(2)).toEqual(['/usr/bin/node', 'cli/index.ts', '--help']);
  });
});
