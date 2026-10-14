import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Sun } from './sun';
import { foundation } from '@/lib/content';
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div>
          <Link href="/" className="brand footer-brand">
            <Sun className="brand-sun" />
            <span>
              <small>FUNDACIÓN</small>
              <strong>son luz.</strong>
            </span>
          </Link>
          <p>Niños del mañana.</p>
        </div>
        <div>
          <span className="eyebrow">Hablemos</span>
          <a href={`mailto:${foundation.email}`} className="footer-email">
            {foundation.email}
            <ArrowUpRight size={18} />
          </a>
          <p>Tu apoyo puede tomar muchas formas.</p>
        </div>
        <div>
          <span className="eyebrow">Tu granito de arena</span>
          <p>
            Cuenta de ahorros {foundation.bank}
            <br />
            <strong>#{foundation.account}</strong>
          </p>
          <Link href="/donate" className="text-link">
            Cómo donar <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Fundación Son Luz</span>
        <span>
          Desarrollado con cariño por{' '}
          <a
            href="https://juanmurillo.co/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Juan Murillo
          </a>
        </span>
        <Link href="/admin">
          Acceso del equipo <ArrowUpRight size={12} />
        </Link>
      </div>
    </footer>
  );
}
