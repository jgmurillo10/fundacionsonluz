import 'server-only';
import { analyticsDomains, type AnalyticsConfig } from '../analytics';
import { cmsConfigured } from './cms';

export function analyticsConfig(): AnalyticsConfig | null {
  if (
    process.env.NODE_ENV !== 'production' ||
    process.env.SONLUZ_ANALYTICS_ENABLED !== '1' ||
    !cmsConfigured()
  )
    return null;
  const domains = analyticsDomains(
    process.env.NEXT_PUBLIC_SITE_URL || 'https://fundacionsonluz.com'
  );
  return domains ? { domains } : null;
}
