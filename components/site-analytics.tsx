'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import {
  analyticsAllowed,
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
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || lastPath.current === pathname) return;
    if (trackPublicPage(config, pathname)) lastPath.current = pathname;
  }, [config, pathname, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const click = (event: MouseEvent) => {
      trackPublicClick(config, event);
    };
    document.addEventListener('click', click, true);
    return () => document.removeEventListener('click', click, true);
  }, [config, enabled]);

  return null;
}
