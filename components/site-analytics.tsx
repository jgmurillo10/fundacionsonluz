'use client';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  analyticsAllowed,
  filterAnalyticsPayload,
  trackPublicClick,
  trackPublicPage,
  type AnalyticsConfig,
} from '@/lib/analytics';

function subscribePrivacyChanges(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

const serverSnapshot = () => false;

export function SiteAnalytics({ config }: { config: AnalyticsConfig }) {
  const pathname = usePathname();
  const enabled = useSyncExternalStore(
    subscribePrivacyChanges,
    () => analyticsAllowed(config),
    serverSnapshot
  );
  const [ready, setReady] = useState(false);
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    window.sonluzAnalyticsBeforeSend = (type, payload) =>
      filterAnalyticsPayload(config, type, payload);
  }, [config]);

  useEffect(() => {
    if (!ready || lastPath.current === pathname) return;
    if (trackPublicPage(config, pathname)) lastPath.current = pathname;
  }, [config, pathname, ready]);

  useEffect(() => {
    if (!ready) return;
    const click = (event: MouseEvent) => {
      trackPublicClick(config, event);
    };
    document.addEventListener('click', click, true);
    return () => document.removeEventListener('click', click, true);
  }, [config, ready]);

  if (!enabled) return null;
  return (
    <Script
      id="sonluz-public-analytics"
      src={config.scriptUrl}
      strategy="afterInteractive"
      data-website-id={config.websiteId}
      data-domains={config.domains.join(',')}
      data-auto-track="false"
      data-exclude-search="true"
      data-exclude-hash="true"
      data-do-not-track="true"
      data-before-send="sonluzAnalyticsBeforeSend"
      onReady={() => setReady(true)}
    />
  );
}
