'use client';
import Link from 'next/link';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="status-page">
      <span className="eyebrow">Algo no salió como esperábamos</span>
      <h1>
        Intentemos
        <br />
        <em>de nuevo.</em>
      </h1>
      <p>
        No pudimos cargar esta página. Tus entradas guardadas no se han
        eliminado.
      </p>
      <div className="button-row">
        <button className="button button-green" onClick={reset}>
          Reintentar
        </button>
        <Link className="text-link" href="/">
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
