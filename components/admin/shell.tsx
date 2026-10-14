'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, FileText, Plus, Sun as SunIcon } from 'lucide-react';
import { Sun } from '../sun';
export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/" className="brand">
          <Sun className="brand-sun" />
          <span>
            <small>FUNDACIÓN</small>
            <strong>son luz.</strong>
          </span>
        </Link>
        <span className="admin-label">Espacio editorial</span>
        <nav aria-label="Administración">
          <Link href="/admin" className={path === '/admin' ? 'active' : ''}>
            <FileText size={17} /> Todas las entradas
          </Link>
          <Link
            href="/admin/posts/new"
            className={path === '/admin/posts/new' ? 'active' : ''}
          >
            <Plus size={17} /> Nueva entrada
          </Link>
          <Link href="/blog" target="_blank" rel="noopener noreferrer">
            <SunIcon size={17} /> Ver el blog <ArrowUpRight size={14} />
          </Link>
        </nav>
        <div className="admin-sidebar-note">
          <Sun />
          <p>
            Historias que nos unen.
            <br />
            Palabras que son luz.
          </p>
        </div>
        <Link href="/" className="admin-return">
          Volver a la web <ArrowUpRight size={14} />
        </Link>
      </aside>
      <div className="admin-main">
        <div className="admin-preview-notice">
          <span className="live-dot" />
          <strong>Modo de revisión local</strong>
          <span>
            Las entradas solo se guardan en este navegador. No se publican en
            Internet.
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
