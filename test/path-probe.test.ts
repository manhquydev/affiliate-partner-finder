import { describe, it, expect, vi, afterEach } from 'vitest';
import { pathProbe } from '../lib/path-probe';

/** Mock fetch: junk path returns `junkStatus`; each real path returns its map value (default 404). */
function mockFetch(junkStatus: number, pathStatus: Record<string, number> = {}) {
  return vi.fn(async (url: string) => {
    const u = new URL(url);
    const path = u.pathname;
    if (path.startsWith('/zzq-')) return { status: junkStatus, url } as Response;
    const status = pathStatus[path] ?? 404;
    return { status, url } as Response;
  });
}

const ORIGIN = 'https://shop.example';

afterEach(() => vi.restoreAllMocks());

describe('pathProbe() — anti-hallucination (docs/05 §C1)', () => {
  it('junk 404, real path 200 ⇒ hit recorded', async () => {
    vi.stubGlobal('fetch', mockFetch(404, { '/affiliate': 200 }));
    const r = await pathProbe(ORIGIN, ['/affiliate', '/nope']);
    expect(r.junkBaselineStatus).toBe(404);
    expect(r.pathHits).toHaveLength(1);
    expect(r.pathHits[0]).toMatchObject({ path: '/affiliate', status: 200, isStrong: true });
  });

  it('soft-404: junk 200 ⇒ NO hits (path-probe disabled)', async () => {
    vi.stubGlobal('fetch', mockFetch(200, { '/affiliate': 200, '/partner': 200 }));
    const r = await pathProbe(ORIGIN, ['/affiliate', '/partner']);
    expect(r.junkBaselineStatus).toBe(200);
    expect(r.pathHits).toEqual([]);
  });

  it('path with same status as junk ⇒ not a hit', async () => {
    vi.stubGlobal('fetch', mockFetch(404, { '/affiliate': 404 }));
    const r = await pathProbe(ORIGIN, ['/affiliate']);
    expect(r.pathHits).toEqual([]);
  });

  it('weak path (no "affiliat") ⇒ hit with isStrong false', async () => {
    vi.stubGlobal('fetch', mockFetch(404, { '/pages/trade': 200 }));
    const r = await pathProbe(ORIGIN, ['/pages/trade']);
    expect(r.pathHits[0]).toMatchObject({ path: '/pages/trade', isStrong: false });
  });

  it('fetch throwing on junk ⇒ junk="err", still probes', async () => {
    const f = vi.fn(async (url: string) => {
      if (new URL(url).pathname.startsWith('/zzq-')) throw new TypeError('Failed to fetch');
      return { status: 200, url } as Response;
    });
    vi.stubGlobal('fetch', f);
    const r = await pathProbe(ORIGIN, ['/affiliate']);
    expect(r.junkBaselineStatus).toBe('err');
    expect(r.pathHits).toHaveLength(1);
  });

  it('is self-contained — survives reconstruction from toString() (criterion 4 / L2)', async () => {
    vi.stubGlobal('fetch', mockFetch(404, { '/affiliate': 200 }));
    const rebuilt = new Function(`return (${pathProbe.toString()})`)() as typeof pathProbe;
    const r = await rebuilt(ORIGIN, ['/affiliate']);
    expect(r.pathHits).toHaveLength(1);
  });
});
