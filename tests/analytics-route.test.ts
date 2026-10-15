import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { POST } from '../app/api/analytics/route';
const origin = 'https://fundacionsonluz.com';
const backend = vi.fn();
function request(
  body: unknown = { type: 'pageview', path: '/about' },
  headers: Record<string, string> = {}
) {
  return new Request(`${origin}/api/analytics`, {
    method: 'POST',
    headers: {
      host: 'fundacionsonluz.com',
      origin,
      referer: `${origin}/about`,
      'content-type': 'application/json',
      'sec-fetch-site': 'same-origin',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('SONLUZ_ANALYTICS_ENABLED', '1');
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', origin);
  vi.stubEnv('SONLUZ_CMS_URL', 'https://worker.example.test');
  vi.stubEnv('SONLUZ_WORKER_SECRET', 's'.repeat(32));
  backend
    .mockReset()
    .mockResolvedValue(Response.json({ accepted: true }, { status: 202 }));
  vi.stubGlobal('fetch', backend);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe('first-party analytics collector', () => {
  it('proxies only normalized event fields and its own Worker authorization', async () => {
    const response = await POST(
      request(undefined, {
        cookie: 'sonluz-editor=private',
        'user-agent': 'Private agent',
        'x-forwarded-for': '192.0.2.1',
      })
    );
    expect(response.status).toBe(204);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const [url, init] = backend.mock.calls[0];
    expect(String(url)).toBe('https://worker.example.test/analytics/events');
    expect(JSON.parse(init.body)).toEqual({
      type: 'pageview',
      path: '/about',
      hostname: 'fundacionsonluz.com',
    });
    expect([...init.headers.keys()]).toEqual(['authorization', 'content-type']);
    expect(JSON.stringify(init)).not.toContain('private');
  });
  it('accepts allowlisted clicks and www', async () => {
    expect(
      (
        await POST(
          request(
            { type: 'click', path: '/about', action: 'nav_home' },
            {
              host: 'www.fundacionsonluz.com',
              origin: 'https://www.fundacionsonluz.com',
              referer: 'https://www.fundacionsonluz.com/about',
            }
          )
        )
      ).status
    ).toBe(204);
  });
  it.each<Record<string, string>>([
    { origin: 'https://evil.example' },
    { origin: '' },
    { host: 'preview.example' },
    { 'sec-fetch-site': 'cross-site' },
    { 'sec-fetch-site': 'same-site' },
    { referer: `${origin}/admin/login` },
    { referer: `${origin}/contact` },
    { referer: 'https://evil.example/about' },
    { referer: '' },
  ])(
    'rejects cross-origin, private or mismatched sources: %j',
    async (headers) => {
      expect((await POST(request(undefined, headers))).status).toBe(403);
      expect(backend).not.toHaveBeenCalled();
    }
  );
  it.each<Record<string, string>>([
    { dnt: '1' },
    { dnt: 'yes' },
    { 'sec-gpc': '1' },
  ])('honors server-side privacy headers: %j', async (headers) => {
    expect((await POST(request(undefined, headers))).status).toBe(204);
    expect(backend).not.toHaveBeenCalled();
  });
  it('does not forward query/fragment data from the source', async () => {
    expect(
      (
        await POST(
          request(undefined, {
            referer: `${origin}/about?email=private#private`,
          })
        )
      ).status
    ).toBe(204);
    expect(backend.mock.calls[0][1].body).not.toContain('private');
  });
  it.each([
    null,
    { type: 'pageview', path: '/admin' },
    { type: 'pageview', path: '/about?email=private' },
    { type: 'pageview', path: '/about', email: 'private' },
    { type: 'click', path: '/about', action: 'private' },
  ])('rejects invalid bodies: %j', async (event) => {
    expect((await POST(request(event))).status).toBe(400);
    expect(backend).not.toHaveBeenCalled();
  });
  it('bounds requests and handles malformed JSON', async () => {
    expect(
      (await POST(request(undefined, { 'content-type': 'text/plain' }))).status
    ).toBe(415);
    expect((await POST(request({ padding: 'a'.repeat(1025) }))).status).toBe(
      413
    );
    expect(
      (
        await POST(
          new Request(`${origin}/api/analytics`, {
            method: 'POST',
            headers: Object.fromEntries(request().headers),
            body: '{',
          })
        )
      ).status
    ).toBe(400);
    expect(backend).not.toHaveBeenCalled();
  });
  it('stays disabled by default, in development and without a Worker', async () => {
    vi.stubEnv('SONLUZ_ANALYTICS_ENABLED', '0');
    expect((await POST(request())).status).toBe(404);
    vi.stubEnv('SONLUZ_ANALYTICS_ENABLED', '1');
    vi.stubEnv('NODE_ENV', 'development');
    expect((await POST(request())).status).toBe(404);
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SONLUZ_CMS_URL', '');
    expect((await POST(request())).status).toBe(404);
    expect(backend).not.toHaveBeenCalled();
  });
  it('returns safe errors when unavailable or limited', async () => {
    backend.mockRejectedValueOnce(new Error('private details'));
    const unavailable = await POST(request());
    expect(unavailable.status).toBe(503);
    expect(await unavailable.text()).not.toContain('private');
    backend.mockResolvedValueOnce(
      Response.json({ error: 'Demasiados eventos.' }, { status: 429 })
    );
    expect((await POST(request())).status).toBe(429);
  });
});
