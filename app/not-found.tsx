import Link from 'next/link';
import { Sun } from '@/components/sun';
export default function NotFound() {
  return (
    <main className="status-page">
      <Sun />
      <span className="eyebrow">404 / No encontramos esta página</span>
      <h1>
        Volvamos a<br />
        <em>encontrar la luz.</em>
      </h1>
      <p>La página no existe o la entrada todavía no está publicada.</p>
      <Link href="/" className="button button-green">
        Volver al inicio
      </Link>
    </main>
  );
}
