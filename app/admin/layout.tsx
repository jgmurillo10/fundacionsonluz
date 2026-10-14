import type { Metadata } from 'next';
import './admin.css';
export const metadata: Metadata = {
  title: 'Espacio editorial',
  robots: { index: false, follow: false },
};
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
