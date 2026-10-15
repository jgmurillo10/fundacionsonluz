import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import {
  analyticsAllowed,
  filterAnalyticsPayload,
  parseAnalyticsEvent,
  publicAnalyticsPath,
  trackPublicClick,
  trackPublicPage,
  type AnalyticsConfig,
} from '../lib/analytics';
import { analyticsConfig } from '../lib/server/analytics';

const origin = 'https://fundacionsonluz.com';
const config: AnalyticsConfig = {
  domains: ['fundacionsonluz.com', 'www.fundacionsonluz.com'],
};
const track = vi.fn();
const storage = new Map<string, string>();
function navigate(path: string, base = origin) {
  Object.defineProperty(window, 'location', {
    value: new URL(path, base),
    configurable: true,
  });
}
class Control {
  disabled = false;
  constructor(
    private attrs: Record<string, string> = {},
    private control: Control | null = null
  ) {}
  closest() {
    return this.control ?? this;
  }
  matches() {
    return this.disabled;
  }
  getAttribute(key: string) {
    return this.attrs[key] ?? null;
  }
}
const click = (target: Control) =>
  trackPublicClick(config, { target } as unknown as MouseEvent);
beforeEach(() => {
  track.mockReset().mockResolvedValue(new Response(null, { status: 204 }));
  storage.clear();
  vi.stubGlobal('fetch', track);
  vi.stubGlobal('window', {
    location: new URL(origin),
    localStorage: { getItem: (key: string) => storage.get(key) ?? null },
  });
  vi.stubGlobal('navigator', { doNotTrack: '0', globalPrivacyControl: false });
  vi.stubGlobal('Element', Control);
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', origin);
  vi.stubEnv('SONLUZ_ANALYTICS_ENABLED', '1');
  vi.stubEnv('SONLUZ_CMS_URL', 'https://cms.example.test');
  vi.stubEnv('SONLUZ_WORKER_SECRET', 's'.repeat(32));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function payload() {
  return JSON.parse(track.mock.calls.at(-1)![1].body);
}

describe('Cloudflare public analytics configuration and routing', () => {
  it('requires production, an explicit flag, a valid production domain and configured Worker', () => {
    expect(analyticsConfig()).toEqual(config);
    for (const flag of ['0', 'true', '']) {
      vi.stubEnv('SONLUZ_ANALYTICS_ENABLED', flag);
      expect(analyticsConfig()).toBeNull();
    }
    vi.stubEnv('SONLUZ_ANALYTICS_ENABLED', '1');
    vi.stubEnv('NODE_ENV', 'development');
    expect(analyticsConfig()).toBeNull();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SONLUZ_WORKER_SECRET', '');
    expect(analyticsConfig()).toBeNull();
  });
  it.each([
    'http://localhost:3005',
    'https://localhost',
    'https://127.0.0.1',
    'https://127.0.0.2',
    'https://sub.localhost',
    'https://[::1]',
    'https://user:pass@example.com',
    `${origin}/?private=yes`,
    `${origin}/#private`,
    `${origin}:444`,
    `${origin}/admin`,
    'invalid',
  ])('rejects unsafe site configuration: %s', (value) => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', value);
    expect(analyticsConfig()).toBeNull();
  });
  it('normalizes www configuration', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.fundacionsonluz.com');
    expect(analyticsConfig()).toEqual(config);
  });
  it.each([
    '/',
    '/about',
    '/donate',
    '/contact',
    '/blog',
    '/blog/una-historia',
    '/blog/una-historia/',
  ])('counts public routes: %s', (path) => {
    navigate(path);
    expect(trackPublicPage(config, path)).toBe(true);
    expect(payload()).toEqual({
      type: 'pageview',
      path: path.replace(/\/$/, '') || '/',
    });
    expect(track).toHaveBeenCalledOnce();
  });
  it.each([
    '/admin',
    '/admin/login',
    '/admin/posts/new',
    '/api/editor/posts',
    '/api/analytics',
    '/media/key',
    '/auth/callback',
    '/%61dmin',
    '/blog/a/b',
    '/unknown',
  ])('excludes non-public routes: %s', (path) => {
    expect(publicAnalyticsPath(path, origin)).toBeNull();
    navigate(path);
    expect(analyticsAllowed(config)).toBe(false);
    expect(trackPublicPage(config, '/')).toBe(false);
    expect(click(new Control({ 'data-analytics': 'contact_submit' }))).toBe(
      false
    );
    expect(track).not.toHaveBeenCalled();
  });
  it('blocks delayed events after entering admin and forged private/external paths', () => {
    expect(trackPublicPage(config, '/admin/login?email=private')).toBe(false);
    expect(trackPublicPage(config, 'https://other.example/about')).toBe(false);
    expect(trackPublicPage(config, '/')).toBe(true);
    navigate('/admin');
    expect(trackPublicPage(config, '/')).toBe(false);
    expect(track).toHaveBeenCalledOnce();
  });
  it('counts public return visits and accepts www', () => {
    for (const path of [
      '/',
      '/about',
      '/blog',
      '/blog/historia',
      '/about',
      '/',
    ]) {
      navigate(path);
      expect(trackPublicPage(config, path)).toBe(true);
    }
    navigate('/', 'https://www.fundacionsonluz.com');
    expect(trackPublicPage(config, '/')).toBe(true);
    expect(track).toHaveBeenCalledTimes(7);
  });
  it.each([
    'http://localhost:3005',
    'https://preview.devinapps.com',
    'https://sonluz.vercel.app',
  ])('excludes local/preview hosts: %s', (host) => {
    navigate('/', host);
    expect(trackPublicPage(config, '/')).toBe(false);
    expect(track).not.toHaveBeenCalled();
  });
});

describe('privacy and transport', () => {
  it('strips queries, hashes, form values, referrers and arbitrary identity data', () => {
    navigate('/contact?email=private@example.test#private');
    expect(
      filterAnalyticsPayload(config, {
        type: 'click',
        path: window.location.href,
        action: 'contact_submit',
        referrer: 'https://private.example',
        email: 'private@example.test',
        data: { message: 'Private message' },
        title: 'Private title',
        id: 'visitor',
      })
    ).toEqual({ type: 'click', path: '/contact', action: 'contact_submit' });
    expect(trackPublicPage(config, window.location.href)).toBe(true);
    expect(track).toHaveBeenCalledWith(
      '/api/analytics',
      expect.objectContaining({
        credentials: 'omit',
        mode: 'same-origin',
        keepalive: true,
        referrer: `${origin}/contact`,
        referrerPolicy: 'same-origin',
        body: JSON.stringify({ type: 'pageview', path: '/contact' }),
      })
    );
    expect(JSON.stringify(track.mock.calls)).not.toMatch(
      /private|cookie|authorization|umami/i
    );
  });
  it.each(['1', 'yes'])('honors DNT: %s', (doNotTrack) => {
    vi.stubGlobal('navigator', { doNotTrack });
    expect(trackPublicPage(config, '/')).toBe(false);
    expect(track).not.toHaveBeenCalled();
  });
  it('honors GPC and both new and legacy local opt-outs after loading', () => {
    expect(trackPublicPage(config, '/')).toBe(true);
    vi.stubGlobal('navigator', { globalPrivacyControl: true });
    expect(trackPublicPage(config, '/')).toBe(false);
    vi.stubGlobal('navigator', {});
    for (const key of ['sonluz.analytics.disabled', 'umami.disabled']) {
      storage.set(key, '1');
      expect(trackPublicPage(config, '/')).toBe(false);
      storage.delete(key);
    }
    expect(track).toHaveBeenCalledOnce();
  });
  it('fails closed when storage cannot be read', () => {
    window.localStorage.getItem = () => {
      throw new Error('Blocked');
    };
    expect(trackPublicPage(config, '/')).toBe(false);
  });
  it('tracks marked nested controls without copying their contents or destinations', () => {
    navigate('/donate');
    expect(
      click(new Control({}, new Control({ 'data-analytics': 'account_copy' })))
    ).toBe(true);
    expect(payload()).toEqual({
      type: 'click',
      path: '/donate',
      action: 'account_copy',
    });
    for (const href of [
      'mailto:private@example.test?subject=Private',
      'https://other.example/?private=yes',
    ])
      expect(
        click(new Control({ 'data-analytics': 'footer_email', href }))
      ).toBe(true);
    expect(JSON.stringify(track.mock.calls)).not.toMatch(
      /private|other.example/i
    );
  });
  it('ignores unmarked, disabled, unknown and admin-targeting controls', () => {
    const disabled = new Control({ 'data-analytics': 'contact_submit' });
    disabled.disabled = true;
    for (const target of [
      new Control(),
      disabled,
      new Control({ 'data-analytics': 'private' }),
      new Control({ 'data-analytics': 'nav_home', href: '/admin' }),
    ])
      expect(click(target)).toBe(false);
    expect(
      trackPublicClick(config, { target: null } as unknown as MouseEvent)
    ).toBe(false);
    expect(track).not.toHaveBeenCalled();
  });
  it('does not break controls on blocked requests or network errors', async () => {
    track.mockImplementationOnce(() => {
      throw new Error('Blocked');
    });
    expect(trackPublicPage(config, '/')).toBe(false);
    track.mockRejectedValueOnce(new Error('Offline'));
    expect(trackPublicPage(config, '/')).toBe(true);
    await Promise.resolve();
  });
  it('mounts only in the public layout without any external tracking script', () => {
    expect(readFileSync('app/(site)/layout.tsx', 'utf8')).toContain(
      '<SiteAnalytics'
    );
    for (const file of [
      'app/layout.tsx',
      'app/admin/layout.tsx',
      'app/admin/(protected)/layout.tsx',
    ])
      expect(readFileSync(file, 'utf8')).not.toContain('SiteAnalytics');
    const component = readFileSync('components/site-analytics.tsx', 'utf8');
    expect(component).not.toMatch(/<Script|umami|beforeSend/);
    expect(component).toContain('lastPath.current === pathname');
    expect(component).toContain(
      "document.removeEventListener('click', click, true)"
    );
  });
});

describe('strict event schema shared with the collector and Worker', () => {
  it.each([
    null,
    [],
    {},
    { type: 'identify', path: '/' },
    { type: 'pageview', path: '/admin' },
    { type: 'pageview', path: '/?email=private' },
    { type: 'pageview', path: '/blog/post#private' },
    { type: 'pageview', path: '/about/' },
    { type: 'pageview', path: '/', email: 'private' },
    { type: 'pageview', path: '/', action: 'nav_home' },
    { type: 'click', path: '/' },
    { type: 'click', path: '/', action: 'private' },
    { type: 'pageview', path: origin },
    { type: 'pageview', path: '/'.repeat(251) },
  ])('rejects malformed, private or noncanonical input: %j', (event) => {
    expect(parseAnalyticsEvent(event)).toBe(false);
  });
});
