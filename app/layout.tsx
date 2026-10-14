import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
const sans = localFont({
  src: '../public/fonts/dm-sans-0.woff2',
  variable: '--font-sans',
  display: 'swap',
  weight: '100 900',
});
const serif = localFont({
  src: [
    {
      path: '../public/fonts/dm-serif-1.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/dm-serif-0.woff2',
      weight: '400',
      style: 'italic',
    },
  ],
  variable: '--font-serif',
  display: 'swap',
});
export const viewport: Viewport = { themeColor: '#f7f6ee' };
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'https://fundacionsonluz.com'
  ),
  title: {
    default: 'Fundación Son Luz · Niños del mañana',
    template: '%s | Fundación Son Luz',
  },
  description:
    'Somos una entidad privada sin ánimo de lucro que contribuye al desarrollo de niños y adolescentes con discapacidad en vulnerabilidad y al apoyo de su familia.',
  openGraph: {
    locale: 'es_CO',
    type: 'website',
    siteName: 'Fundación Son Luz',
    images: [
      {
        url: '/images/banner.jpg',
        alt: 'Una actividad de la Fundación Son Luz',
      },
    ],
  },
  twitter: { card: 'summary_large_image' },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
