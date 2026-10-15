import 'server-only';
import type { AnalyticsConfig } from '../analytics';

export function analyticsConfig(): AnalyticsConfig | null {
  if (process.env.NODE_ENV !== 'production') return null;
  const websiteId = process.env.SONLUZ_UMAMI_WEBSITE_ID?.trim();
  if (
    !websiteId ||
    !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(websiteId)
  )
    return null;
  try {
    const site = new URL(
      process.env.NEXT_PUBLIC_SITE_URL || 'https://fundacionsonluz.com'
    );
    const script = new URL(
      process.env.SONLUZ_UMAMI_SCRIPT_URL || 'https://cloud.umami.is/script.js'
    );
    if (
      [site, script].some(
        (url) =>
          url.protocol !== 'https:' ||
          url.username ||
          url.password ||
          url.search ||
          url.hash ||
          url.port
      )
    )
      return null;
    const host = site.hostname.replace(/^www\./, '');
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]')
      return null;
    return {
      websiteId,
      scriptUrl: script.href,
      domains: [host, `www.${host}`],
    };
  } catch {
    return null;
  }
}
