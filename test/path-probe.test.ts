import { describe, it, expect, vi, afterEach } from 'vitest';
import { toInjectableSource } from '../cli/injectable';
import { pathProbe } from '../lib/path-probe';

function injectPathProbe(): typeof pathProbe {
  const src = toInjectableSource(pathProbe as (...args: never[]) => unknown);
  expect(src.includes('__name')).toBe(false);
  expect(src.includes('import')).toBe(false);
  expect(src.includes('require(')).toBe(false);
  return new Function(`return (${src})`)() as typeof pathProbe;
}

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

  it('is self-contained — survives toInjectableSource (Playwright inject path)', async () => {
    vi.stubGlobal('fetch', mockFetch(404, { '/affiliate': 200 }));
    const rebuilt = injectPathProbe();
    const r = await rebuilt(ORIGIN, ['/affiliate']);
    expect(r.pathHits).toHaveLength(1);
  });

  it('parallel batch 3 returns same hits as sequential', async () => {
    vi.stubGlobal('fetch', mockFetch(404, { '/affiliate': 200, '/partner': 200 }));
    const seq = await pathProbe(ORIGIN, ['/affiliate', '/partner'], 8000, 1);
    const par = await pathProbe(ORIGIN, ['/affiliate', '/partner'], 8000, 3);
    expect(seq.pathHits).toHaveLength(2);
    expect(par.pathHits).toHaveLength(2);
    expect(par.pathHits.map((h) => h.path).sort()).toEqual(seq.pathHits.map((h) => h.path).sort());
  });

  it('parallel inject self-contained with batch arg via toInjectableSource', async () => {
    vi.stubGlobal('fetch', mockFetch(404, { '/affiliate': 200 }));
    const rebuilt = injectPathProbe();
    const r = await rebuilt(ORIGIN, ['/affiliate'], 8000, 3);
    expect(r.pathHits).toHaveLength(1);
  });

  it('does not stop on first 200 — later path still recorded', async () => {
    vi.stubGlobal('fetch', mockFetch(404, { '/affiliate': 200, '/partner': 200 }));
    const seq = await pathProbe(ORIGIN, ['/affiliate', '/partner'], 8000, 1);
    const par = await pathProbe(ORIGIN, ['/affiliate', '/partner'], 8000, 3);
    expect(seq.pathHits.map((h) => h.path).sort()).toEqual(['/affiliate', '/partner']);
    expect(par.pathHits.map((h) => h.path).sort()).toEqual(['/affiliate', '/partner']);
    expect(seq.pathHits).toHaveLength(2);
    expect(par.pathHits).toHaveLength(2);
  });

  it('records a later-chunk 200 after an earlier-chunk 200 (no stop-on-hit)', async () => {
    vi.stubGlobal('fetch', mockFetch(404, { '/a': 200, '/d': 200 }));
    const r = await pathProbe(ORIGIN, ['/a', '/b', '/c', '/d'], 8000, 3);
    expect(r.pathHits.map((h) => h.path).sort()).toEqual(['/a', '/d']);
    expect(r.pathHits).toHaveLength(2);
  });

  it('parallelBatch 4 clamps to 3 in-flight fetches', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const f = vi.fn(async (url: string) => {
      const path = new URL(url).pathname;
      if (path.startsWith('/zzq-')) return { status: 404, url } as Response;
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await Promise.resolve();
      inFlight -= 1;
      return { status: 200, url } as Response;
    });
    vi.stubGlobal('fetch', f);
    const r = await pathProbe(ORIGIN, ['/a', '/b', '/c', '/d'], 8000, 4);
    expect(r.pathHits).toHaveLength(4);
    expect(maxInFlight).toBe(3);
    expect(maxInFlight).toBeLessThanOrEqual(3);
  });

  it('junk-first: first fetch is /zzq-; junk 200 skips all path fetches', async () => {
    const order: string[] = [];
    const f = vi.fn(async (url: string) => {
      const path = new URL(url).pathname;
      order.push(path.startsWith('/zzq-') ? '/zzq-' : path);
      if (path.startsWith('/zzq-')) return { status: 200, url } as Response;
      return { status: 200, url } as Response;
    });
    vi.stubGlobal('fetch', f);
    const r = await pathProbe(ORIGIN, ['/affiliate', '/partner']);
    expect(order[0]).toBe('/zzq-');
    expect(f.mock.calls).toHaveLength(1);
    expect(r.pathHits).toEqual([]);
  });

  it('sibling abort does not drop later 200 in the same batch', async () => {
    const f = vi.fn(async (url: string, init?: RequestInit) => {
      const path = new URL(url).pathname;
      if (path.startsWith('/zzq-')) return { status: 404, url } as Response;
      if (path === '/partner') {
        const { promise, reject } = Promise.withResolvers<Response>();
        const fail = () =>
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        if (init?.signal?.aborted) fail();
        else init?.signal?.addEventListener('abort', fail, { once: true });
        return await promise;
      }
      return { status: 200, url } as Response;
    });
    vi.stubGlobal('fetch', f);
    const r = await pathProbe(ORIGIN, ['/partner', '/affiliate'], 30, 2);
    expect(r.pathHits.map((h) => h.path)).toContain('/affiliate');
  });

  it('budget 0 after junk ⇒ incomplete, empty hits, junk-only fetch', async () => {
    const f = mockFetch(404, { '/affiliate': 200, '/partner': 200 });
    vi.stubGlobal('fetch', f);
    const r = await pathProbe(ORIGIN, ['/affiliate', '/partner'], 8000, 1, 0);
    expect(r.incomplete).toBe(true);
    expect(r.pathHits).toEqual([]);
    expect(f.mock.calls).toHaveLength(1);
  });

  it('inner deadline keeps prefix hits and does not start later chunks', async () => {
    let now = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const f = vi.fn(async (url: string) => {
      const path = new URL(url).pathname;
      if (path.startsWith('/zzq-')) return { status: 404, url } as Response;
      now += 100;
      return { status: 200, url } as Response;
    });
    vi.stubGlobal('fetch', f);
    const r = await pathProbe(ORIGIN, ['/a', '/b', '/c'], 50, 1, 120);
    expect(r.pathHits.map((h) => h.path)).toEqual(['/a']);
    expect(r.incomplete).toBe(true);
  });

  it('injectable 5th budget arg still self-contained', async () => {
    vi.stubGlobal('fetch', mockFetch(404, { '/affiliate': 200 }));
    const rebuilt = injectPathProbe();
    const r = await rebuilt(ORIGIN, ['/affiliate'], 8000, 1, 90_000);
    expect(r.pathHits).toHaveLength(1);
    expect(r.incomplete).toBe(false);
  });
});
