export type AnalyticsConfig = {
  websiteId: string;
  scriptUrl: string;
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
type AnalyticsPayload = {
  website: string;
  hostname: string;
  url: string;
  name?: AnalyticsAction;
};

declare global {
  interface Window {
    umami?: { track: (payload: AnalyticsPayload) => Promise<unknown> | void };
    sonluzAnalyticsBeforeSend?: (
      type: string,
      payload: Record<string, unknown>
    ) => AnalyticsPayload | false;
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
    return !window.localStorage.getItem('umami.disabled');
  } catch {
    return false;
  }
}

export function filterAnalyticsPayload(
  config: AnalyticsConfig,
  type: string,
  payload: Record<string, unknown>
): AnalyticsPayload | false {
  if (type !== 'event' || !analyticsAllowed(config)) return false;
  if (typeof payload.url !== 'string') return false;
  const path = publicAnalyticsPath(payload.url, window.location.origin);
  if (!path) return false;
  if (
    payload.name !== undefined &&
    !analyticsActions.includes(payload.name as AnalyticsAction)
  )
    return false;
  return {
    website: config.websiteId,
    hostname: window.location.hostname,
    url: path,
    ...(payload.name ? { name: payload.name as AnalyticsAction } : {}),
  };
}

export function trackPublicPage(config: AnalyticsConfig, pathname: string) {
  return send(config, { url: pathname });
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
  return send(config, { url: window.location.pathname, name: action });
}

function send(config: AnalyticsConfig, input: Record<string, unknown>) {
  const payload = filterAnalyticsPayload(config, 'event', input);
  if (!payload || !window.umami) return false;
  try {
    void Promise.resolve(window.umami.track(payload)).catch(() => {});
    return true;
  } catch {
    return false;
  }
}
