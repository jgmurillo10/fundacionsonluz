export type AnalyticsConfig = {
  domains: string[];
};

export const analyticsActions = [
  'nav_home',
  'nav_about',
  'nav_blog',
  'nav_contact',
  'mobile_nav_home',
  'mobile_nav_about',
  'mobile_nav_blog',
  'mobile_nav_contact',
  'menu_open',
  'menu_close',
  'donate_header',
  'donate_mobile',
  'home_about',
  'home_purpose',
  'home_mission',
  'home_blog',
  'join_donate',
  'join_contact',
  'donate_contact',
  'account_copy',
  'contact_email',
  'contact_submit',
  'contact_fallback_email',
  'footer_home',
  'footer_email',
  'footer_donate',
  'footer_developer',
  'blog_read',
  'blog_back',
  'blog_contact',
] as const;
type AnalyticsAction = (typeof analyticsActions)[number];
export type AnalyticsEvent =
  | { type: 'pageview'; path: string }
  | { type: 'click'; path: string; action: AnalyticsAction };

export function analyticsDomains(value: string): string[] | null {
  try {
    const site = new URL(value);
    const host = site.hostname.replace(/^www\./, '');
    if (
      site.protocol !== 'https:' ||
      site.username ||
      site.password ||
      site.search ||
      site.hash ||
      site.port ||
      site.pathname !== '/' ||
      !host.includes('.') ||
      host.endsWith('.localhost') ||
      host.includes(':') ||
      /^\d+(?:\.\d+){3}$/.test(host)
    )
      return null;
    return [host, `www.${host}`];
  } catch {
    return null;
  }
}

export function publicAnalyticsPath(value: string, origin: string) {
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin) return null;
    const path = url.pathname.replace(/\/$/, '') || '/';
    if (path.length > 250) return null;
    return /^\/(?:about|donate|contact|blog(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?)?$/.test(
      path
    )
      ? path
      : null;
  } catch {
    return null;
  }
}

export function analyticsAllowed(config: AnalyticsConfig) {
  if (typeof window === 'undefined') return false;
  if (!config.domains.includes(window.location.hostname)) return false;
  if (!publicAnalyticsPath(window.location.href, window.location.origin))
    return false;
  if (
    navigator.doNotTrack === '1' ||
    navigator.doNotTrack === 'yes' ||
    (navigator as Navigator & { globalPrivacyControl?: boolean })
      .globalPrivacyControl
  )
    return false;
  try {
    return (
      !window.localStorage.getItem('sonluz.analytics.disabled') &&
      !window.localStorage.getItem('umami.disabled')
    );
  } catch {
    return false;
  }
}

export function filterAnalyticsPayload(
  config: AnalyticsConfig,
  payload: Record<string, unknown>
): AnalyticsEvent | false {
  if (!analyticsAllowed(config) || typeof payload.path !== 'string')
    return false;
  const path = publicAnalyticsPath(payload.path, window.location.origin);
  if (!path) return false;
  return parseAnalyticsEvent({
    type: payload.type,
    path,
    ...(payload.action === undefined ? {} : { action: payload.action }),
  });
}

export function parseAnalyticsEvent(value: unknown): AnalyticsEvent | false {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const event = value as Record<string, unknown>;
  if (
    Object.keys(event).some(
      (key) => !['type', 'path', 'action'].includes(key)
    ) ||
    typeof event.path !== 'string' ||
    publicAnalyticsPath(event.path, 'https://analytics.invalid') !== event.path
  )
    return false;
  if (event.type === 'pageview' && event.action === undefined)
    return { type: 'pageview', path: event.path };
  if (
    event.type === 'click' &&
    analyticsActions.includes(event.action as AnalyticsAction)
  )
    return {
      type: 'click',
      path: event.path,
      action: event.action as AnalyticsAction,
    };
  return false;
}

export function trackPublicPage(config: AnalyticsConfig, pathname: string) {
  return send(config, { type: 'pageview', path: pathname });
}

export function trackPublicClick(config: AnalyticsConfig, event: MouseEvent) {
  if (!(event.target instanceof Element)) return false;
  const control = event.target.closest(
    'a[data-analytics], button[data-analytics]'
  );
  if (!control || control.matches(':disabled, [aria-disabled="true"]'))
    return false;
  const action = control.getAttribute('data-analytics');
  if (!analyticsActions.includes(action as AnalyticsAction)) return false;
  const href = control.getAttribute('href');
  if (href) {
    try {
      const destination = new URL(href, window.location.href);
      if (
        destination.origin === window.location.origin &&
        !publicAnalyticsPath(href, window.location.origin)
      )
        return false;
    } catch {
      return false;
    }
  }
  return send(config, {
    type: 'click',
    path: window.location.pathname,
    action,
  });
}

function send(config: AnalyticsConfig, input: Record<string, unknown>) {
  const payload = filterAnalyticsPayload(config, input);
  if (!payload) return false;
  try {
    void fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'omit',
      mode: 'same-origin',
      cache: 'no-store',
      keepalive: true,
      referrer: `${window.location.origin}${payload.path}`,
      referrerPolicy: 'same-origin',
    }).catch(() => {});
    return true;
  } catch {
    return false;
  }
}
