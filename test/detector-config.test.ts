import { describe, it, expect } from 'vitest';
import { mergeConfig } from '../lib/detector-config';
import { CONFIG } from '../lib/config';

describe('mergeConfig — user config override (Đợt 3 / NFR-05)', () => {
  it('null override → built-in CONFIG unchanged', () => {
    expect(mergeConfig(null)).toEqual(CONFIG);
  });

  it('non-empty override list replaces that list only', () => {
    const merged = mergeConfig({ strong: ['affiliate', 'partnerprogramm'] });
    expect(merged.strong).toEqual(['affiliate', 'partnerprogramm']);
    expect(merged.weak).toEqual(CONFIG.weak); // untouched → default
    expect(merged.platforms).toEqual(CONFIG.platforms);
    expect(merged.paths).toEqual(CONFIG.paths);
  });

  it('empty list falls back to default (never disables detection)', () => {
    const merged = mergeConfig({ strong: [], platforms: [] });
    expect(merged.strong).toEqual(CONFIG.strong);
    expect(merged.platforms).toEqual(CONFIG.platforms);
  });

  it('detectorVersion always comes from the built-in config', () => {
    expect(mergeConfig({ strong: ['x'] }).detectorVersion).toBe(CONFIG.detectorVersion);
  });
});
