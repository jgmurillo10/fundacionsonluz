import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/footer';
import { Animations } from '@/components/animations';
import { SiteAnalytics } from '@/components/site-analytics';
import { analyticsConfig } from '@/lib/server/analytics';
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const analytics = analyticsConfig();
  return (
    <>
      <a href="#main-content" className="skip-link">
        Saltar al contenido
      </a>
      <Navigation />
      <main id="main-content">{children}</main>
      <Footer />
      <Animations />
      {analytics && <SiteAnalytics config={analytics} />}
    </>
  );
}
