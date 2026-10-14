import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/footer';
import { Animations } from '@/components/animations';
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Saltar al contenido
      </a>
      <Navigation />
      <main id="main-content">{children}</main>
      <Footer />
      <Animations />
    </>
  );
}
