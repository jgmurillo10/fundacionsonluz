'use client';
/* eslint-disable @next/next/no-img-element -- Thumbnails are local preview data URLs. */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowUpRight, FileText, Plus, Search, Download } from 'lucide-react';
import { type Post, postDate } from '@/lib/blog';
import { listLocalPosts, subscribeLocalPosts } from '@/lib/local-posts';
import { Sun } from '../sun';
export function Dashboard() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    const update = () => {
      try {
        setPosts(listLocalPosts());
        setError('');
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'No pudimos leer las entradas.'
        );
      }
    };
    update();
    return subscribeLocalPosts(update);
  }, []);
  function exportPosts() {
    if (!posts) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify({ format: 'sonluz-blog-v1', posts }, null, 2)], {
        type: 'application/json',
      })
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `sonluz-entradas-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  const filtered = posts?.filter(
    (post) =>
      (filter === 'all' || post.status === filter) &&
      `${post.title} ${post.category}`
        .toLocaleLowerCase('es')
        .includes(query.toLocaleLowerCase('es'))
  );
  return (
    <div className="admin-page">
      <header className="admin-page-heading">
        <div>
          <span className="eyebrow">Un espacio para compartir nuestra luz</span>
          <h1>
            Tus historias<span>.</span>
          </h1>
          <p>Crea, cuida y comparte las entradas de la fundación.</p>
        </div>
        <Link href="/admin/posts/new" className="button button-green">
          <Plus size={17} /> Nueva entrada
        </Link>
      </header>
      <div className="admin-stats">
        <div>
          <span>Todas las entradas</span>
          <strong>{posts?.length ?? '—'}</strong>
          <FileText size={20} />
        </div>
        <div>
          <span>Publicadas en la vista previa</span>
          <strong>
            {posts?.filter((post) => post.status === 'published').length ?? '—'}
          </strong>
          <Sun />
        </div>
        <div>
          <span>En borrador</span>
          <strong>
            {posts?.filter((post) => post.status === 'draft').length ?? '—'}
          </strong>
          <FileText size={20} />
        </div>
      </div>
      <section className="admin-list-panel">
        <div className="admin-list-tools">
          <div
            className="admin-tabs"
            role="group"
            aria-label="Filtrar entradas"
          >
            {[
              { value: 'all', label: 'Todas' },
              { value: 'published', label: 'Publicadas' },
              { value: 'draft', label: 'Borradores' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={filter === tab.value ? 'selected' : ''}
                aria-pressed={filter === tab.value}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <label className="admin-search">
            <Search size={16} />
            <span className="sr-only">
              Buscar entradas por título o categoría
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar una historia…"
            />
          </label>
        </div>
        {error && (
          <p className="form-message form-error" role="alert">
            {error}
          </p>
        )}
        {!posts && !error && (
          <p className="admin-loading" role="status">
            Cargando tus historias…
          </p>
        )}
        {filtered?.length ? (
          <div className="admin-posts">
            {filtered.map((post) => (
              <Link
                href={`/admin/posts/${post.id}`}
                key={post.id}
                className="admin-post-row"
              >
                <div className="admin-post-thumbnail">
                  {post.coverImage ? (
                    <img src={post.coverImage} alt="" />
                  ) : (
                    <Sun />
                  )}
                </div>
                <div className="admin-post-details">
                  <span className="eyebrow">{post.category}</span>
                  <h2>{post.title}</h2>
                  <span>Editada el {postDate(post.updatedAt)}</span>
                </div>
                <span className={`status-badge ${post.status}`}>
                  {post.status === 'draft' ? 'Borrador' : 'Publicada · local'}
                </span>
                <ArrowUpRight size={18} />
              </Link>
            ))}
          </div>
        ) : (
          posts &&
          !error && (
            <div className="admin-empty">
              <Sun />
              <h2>
                {posts.length
                  ? 'No encontramos esa historia.'
                  : 'Toda historia empieza con una idea.'}
              </h2>
              <p>
                {posts.length
                  ? 'Prueba otra búsqueda o cambia el filtro.'
                  : 'Este espacio está listo para tu primera entrada. Escríbela a tu ritmo y guárdala como borrador.'}
              </p>
              {!posts.length && (
                <Link href="/admin/posts/new" className="button button-green">
                  Crear mi primera entrada <Plus size={16} />
                </Link>
              )}
            </div>
          )
        )}
      </section>
      <div className="admin-export">
        <p>
          Antes de cambiar de navegador o borrar sus datos, exporta tus
          entradas. Esta copia se podrá usar para la migración al blog
          definitivo.
        </p>
        <button
          onClick={exportPosts}
          disabled={!posts?.length}
          className="text-link"
        >
          <Download size={15} /> Exportar entradas
        </button>
      </div>
    </div>
  );
}
