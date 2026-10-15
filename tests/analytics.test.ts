import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import {
  analyticsAllowed,
  filterAnalyticsPayload,
  publicAnalyticsPath,
  trackPublicClick,
  trackPublicPage,
  type AnalyticsConfig,
} from '../lib/analytics';
import { analyticsConfig } from '../lib/server/analytics';

const websiteId = '94db1cb1-74f4-4a40-ad6c-962362670409';
const origin = 'https://fundacionsonluz.com';
const config: AnalyticsConfig = {
  websiteId,
  scriptUrl: 'https://cloud.umami.is/script.js',
  domains: ['fundacionsonluz.com', 'www.fundacionsonluz.com'],
};
const track = vi.fn();
const storage = new Map<string, string>();

function navigate(path: string, base = origin) {
  Object.defineProperty(window, 'location', {
    value: new URL(path, base),
    writable: true,
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

function click(control: Control) {
  return trackPublicClick(config, { target: control } as unknown as MouseEvent);
}

beforeEach(() => {
  track.mockReset();
  storage.clear();
  vi.stubGlobal('window', {
    location: new URL(origin),
    localStorage: { getItem: (key: string) => storage.get(key) ?? null },
    umami: { track },
  });
  vi.stubGlobal('navigator', { doNotTrack: '0', globalPrivacyControl: false });
  vi.stubGlobal('Element', Control);
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', origin);
  vi.stubEnv('SONLUZ_UMAMI_WEBSITE_ID', websiteId);
  vi.stubEnv('SONLUZ_UMAMI_SCRIPT_URL', '');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('analytics configuration and route isolation', () => {
  it('requires an explicit website ID and production mode', () => {
    expect(analyticsConfig()).toEqual(config);
    vi.stubEnv('SONLUZ_UMAMI_WEBSITE_ID', '');
    expect(analyticsConfig()).toBeNull();
    vi.stubEnv('SONLUZ_UMAMI_WEBSITE_ID', 'not-an-id');
    expect(analyticsConfig()).toBeNull();
    vi.stubEnv('SONLUZ_UMAMI_WEBSITE_ID', websiteId);
    vi.stubEnv('NODE_ENV', 'development');
    expect(analyticsConfig()).toBeNull();
  });

  it('accepts HTTPS self-hosted Umami without exposing any credentials', () => {
    vi.stubEnv(
      'SONLUZ_UMAMI_SCRIPT_URL',
      'https://stats.example.com/script.js'
    );
    expect(analyticsConfig()?.scriptUrl).toBe(
      'https://stats.example.com/script.js'
    );
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.fundacionsonluz.com');
    expect(analyticsConfig()?.domains).toEqual(config.domains);
  });

  it.each([
    'http://stats.example.com/script.js',
    'https://user:password@stats.example.com/script.js',
    'https://stats.example.com/script.js?secret=value',
    'https://stats.example.com/script.js#hash',
    'https://stats.example.com:444/script.js',
    'javascript:alert(1)',
  ])('rejects an unsafe tracker URL: %s', (value) => {
    vi.stubEnv('SONLUZ_UMAMI_SCRIPT_URL', value);
    expect(analyticsConfig()).toBeNull();
  });

  it.each(['http://localhost:3005', 'https://localhost', 'https://127.0.0.1'])(
    'does not configure a localhost site: %s',
    (value) => {
      vi.stubEnv('NEXT_PUBLIC_SITE_URL', value);
      expect(analyticsConfig()).toBeNull();
    }
  );

  it.each([
    '/',
    '/about',
    '/donate',
    '/contact',
    '/blog',
    '/blog/una-historia',
    '/blog/una-historia/',
  ])('tracks public routes only: %s', (path) => {
    navigate(path);
    expect(trackPublicPage(config, path)).toBe(true);
    expect(track).toHaveBeenCalledOnce();
    expect(track).toHaveBeenCalledWith({
      website: websiteId,
      hostname: 'fundacionsonluz.com',
      url: path.replace(/\/$/, '') || '/',
    });
  });

  it.each([
    '/admin',
    '/admin/login',
    '/admin/posts/new',
    '/admin/posts/private-id',
    '/api/editor/posts',
    '/auth/callback',
    '/media/key',
    '/%61dmin',
    '/blog/a/b',
    '/unknown',
  ])('cannot track private/non-site routes: %s', (path) => {
    expect(publicAnalyticsPath(path, origin)).toBeNull();
    navigate(path);
    expect(analyticsAllowed(config)).toBe(false);
    expect(trackPublicPage(config, '/')).toBe(false);
    expect(click(new Control({ 'data-analytics': 'contact_submit' }))).toBe(
      false
    );
    expect(track).not.toHaveBeenCalled();
  });

  it('blocks private and external payload URLs even on a public page', () => {
    expect(trackPublicPage(config, '/admin/login?email=secret')).toBe(false);
    expect(trackPublicPage(config, 'https://other.example/about')).toBe(false);
    expect(track).not.toHaveBeenCalled();
  });

  it('cannot send delayed events after navigating into admin', () => {
    expect(trackPublicPage(config, '/')).toBe(true);
    navigate('/admin/login');
    expect(
      filterAnalyticsPayload(config, 'event', {
        url: '/',
        name: 'donate_header',
      })
    ).toBe(false);
    expect(trackPublicPage(config, '/')).toBe(false);
    expect(track).toHaveBeenCalledOnce();
  });

  it('counts public navigation, return visits and blog pages without tracking admin', () => {
    for (const path of [
      '/',
      '/about',
      '/blog',
      '/blog/una-historia',
      '/about',
      '/',
    ]) {
      navigate(path);
      expect(trackPublicPage(config, path)).toBe(true);
    }
    expect(track).toHaveBeenCalledTimes(6);
    navigate('/admin');
    expect(trackPublicPage(config, '/admin')).toBe(false);
    navigate('/');
    expect(trackPublicPage(config, '/')).toBe(true);
    expect(track).toHaveBeenCalledTimes(7);
  });
});

describe('analytics privacy and public interactions', () => {
  it('drops queries, hashes, referrers, titles, form values and identity data', () => {
    navigate('/contact?email=visitor@example.test#private');
    const payload = filterAnalyticsPayload(config, 'event', {
      url: window.location.href,
      name: 'contact_submit',
      website: 'other',
      hostname: 'other',
      referrer: 'https://example.com/?token=private',
      title: 'Private title',
      data: {
        email: 'visitor@example.test',
        phone: '123',
        message: 'Private message',
      },
      id: 'visitor-id',
      tag: 'private-tag',
    });
    expect(payload).toEqual({
      website: websiteId,
      hostname: 'fundacionsonluz.com',
      url: '/contact',
      name: 'contact_submit',
    });
    expect(
      filterAnalyticsPayload(config, 'identify', {
        url: '/contact',
        id: 'visitor-id',
      })
    ).toBe(false);
    expect(
      filterAnalyticsPayload(config, 'event', {
        url: '/contact',
        name: 'visitor@example.test',
      })
    ).toBe(false);
  });

  it.each(['1', 'yes'])('respects Do Not Track: %s', (value) => {
    vi.stubGlobal('navigator', { doNotTrack: value });
    expect(analyticsAllowed(config)).toBe(false);
    expect(trackPublicPage(config, '/')).toBe(false);
    expect(track).not.toHaveBeenCalled();
  });

  it('respects Global Privacy Control and opt-out changes after loading', () => {
    expect(trackPublicPage(config, '/')).toBe(true);
    vi.stubGlobal('navigator', { globalPrivacyControl: true });
    expect(trackPublicPage(config, '/')).toBe(false);
    vi.stubGlobal('navigator', {});
    storage.set('umami.disabled', '1');
    expect(trackPublicPage(config, '/')).toBe(false);
    expect(track).toHaveBeenCalledOnce();
  });

  it('fails closed when privacy storage is inaccessible', () => {
    window.localStorage.getItem = () => {
      throw new Error('Storage blocked');
    };
    expect(analyticsAllowed(config)).toBe(false);
    expect(trackPublicPage(config, '/')).toBe(false);
  });

  it.each([
    'http://localhost:3005',
    'https://preview.devinapps.com',
    'https://sonluz.vercel.app',
  ])('does not send from local or preview hosts: %s', (host) => {
    navigate('/', host);
    expect(trackPublicPage(config, '/')).toBe(false);
    expect(track).not.toHaveBeenCalled();
  });

  it('supports the public www domain', () => {
    navigate('/', 'https://www.fundacionsonluz.com');
    expect(trackPublicPage(config, '/')).toBe(true);
    expect(track.mock.calls[0][0].hostname).toBe('www.fundacionsonluz.com');
  });

  it('records a named click on nested button/icon content, without reading text', () => {
    navigate('/donate');
    const button = new Control({ 'data-analytics': 'account_copy' });
    expect(click(new Control({}, button))).toBe(true);
    expect(track).toHaveBeenCalledWith({
      website: websiteId,
      hostname: 'fundacionsonluz.com',
      url: '/donate',
      name: 'account_copy',
    });
  });

  it('does not record unmarked, disabled, unknown or admin controls', () => {
    const disabled = new Control({ 'data-analytics': 'contact_submit' });
    disabled.disabled = true;
    for (const control of [
      new Control(),
      disabled,
      new Control({ 'data-analytics': 'private message' }),
      new Control({ 'data-analytics': 'nav_home', href: '/admin' }),
    ]) {
      expect(click(control)).toBe(false);
    }
    expect(
      trackPublicClick(config, { target: null } as unknown as MouseEvent)
    ).toBe(false);
    expect(track).not.toHaveBeenCalled();
  });

  it('records annotated mail and external links without sending destinations', () => {
    expect(
      click(
        new Control({
          'data-analytics': 'footer_email',
          href: 'mailto:private@example.test?subject=Private',
        })
      )
    ).toBe(true);
    expect(
      click(
        new Control({
          'data-analytics': 'footer_developer',
          href: 'https://juanmurillo.co/?private=value',
        })
      )
    ).toBe(true);
    expect(JSON.stringify(track.mock.calls)).not.toMatch(
      /private|mailto|juanmurillo/
    );
  });

  it('leaves website actions working when the script is blocked or errors', async () => {
    delete window.umami;
    expect(trackPublicPage(config, '/')).toBe(false);
    window.umami = { track };
    track.mockImplementationOnce(() => {
      throw new Error('Blocked');
    });
    expect(trackPublicPage(config, '/')).toBe(false);
    track.mockRejectedValueOnce(new Error('Offline'));
    expect(trackPublicPage(config, '/')).toBe(true);
    await Promise.resolve();
  });

  it('mounts the tracker only in the public layout and disables automatic collection', () => {
    expect(readFileSync('app/(site)/layout.tsx', 'utf8')).toContain(
      '<SiteAnalytics'
    );
    for (const file of [
      'app/layout.tsx',
      'app/admin/layout.tsx',
      'app/admin/(protected)/layout.tsx',
    ]) {
      expect(readFileSync(file, 'utf8')).not.toContain('SiteAnalytics');
    }
    const component = readFileSync('components/site-analytics.tsx', 'utf8');
    expect(component).toContain('data-auto-track="false"');
    expect(component).toContain('data-before-send="sonluzAnalyticsBeforeSend"');
    expect(component).toContain('lastPath.current === pathname');
    expect(component).toContain(
      "document.removeEventListener('click', click, true)"
    );
  });
});
