'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowUpRight, FileText, Plus, Sun as SunIcon } from 'lucide-react';
import { Sun } from '../sun';
import { RemoteEditorContext } from './editor-context';
export function AdminShell({
  children,
  remote = false,
  sandbox = false,
}: {
  children: React.ReactNode;
  remote?: boolean;
  sandbox?: boolean;
}) {
  const path = usePathname();
  const router = useRouter();
  const [error, setError] = useState('');
  return (
    <RemoteEditorContext.Provider value={remote}>
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
          {remote && !sandbox && (
            <button
              className="admin-return"
              onClick={async () => {
                setError('');
                try {
                  const response = await fetch('/api/editor/session', {
                    method: 'DELETE',
                  });
                  if (!response.ok && response.status !== 401)
                    throw new Error(
                      'No pudimos cerrar la sesión. Intenta de nuevo.'
                    );
                  router.replace('/admin/login');
                  router.refresh();
                } catch (reason) {
                  setError(
                    reason instanceof Error
                      ? reason.message
                      : 'No pudimos cerrar la sesión.'
                  );
                }
              }}
            >
              Cerrar sesión
            </button>
          )}
          {error && (
            <p className="form-message form-error" role="alert">
              {error}
            </p>
          )}
        </aside>
        <div className="admin-main">
          <div className="admin-preview-notice">
            <span className="live-dot" />
            <strong>
              {remote
                ? sandbox
                  ? 'Backend local de pruebas'
                  : 'Blog conectado'
                : 'Modo de revisión local'}
            </strong>
            <span>
              {remote
                ? sandbox
                  ? 'D1 y R2 locales. No utiliza la base ni el bucket remotos.'
                  : 'Las entradas se guardan en D1 y las imágenes en el bucket privado.'
                : 'Las entradas solo se guardan en este navegador. No se publican en Internet.'}
            </span>
          </div>
          {children}
        </div>
      </div>
    </RemoteEditorContext.Provider>
  );
}
