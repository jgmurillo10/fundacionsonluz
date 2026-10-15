'use client';
/* eslint-disable @next/next/no-img-element -- Local preview images have no externally fetchable URL. */
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Eye,
  ImagePlus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import {
  categories,
  documentText,
  slugify,
  type Post,
  type PostInput,
} from '@/lib/blog';
import {
  blankPost,
  deleteLocalPost,
  listLocalPosts,
  saveLocalPost,
} from '@/lib/local-posts';
import {
  deletePost,
  getPost,
  prepareEditorialImage,
  savePost,
} from '@/lib/editor-client';
import { useRemoteEditor } from './editor-context';
import { RichContent } from '../rich-content';
const RichEditor = dynamic(
  () => import('./editor').then((module) => module.RichEditor),
  {
    ssr: false,
    loading: () => <p className="editor-loading">Preparando el editor…</p>,
  }
);

export function PostEditor({ id }: { id?: string }) {
  const remote = useRemoteEditor();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [input, setInput] = useState<PostInput>(blankPost);
  const [loaded, setLoaded] = useState(!id);
  const [dirty, setDirty] = useState(false);
  const [slugEdited, setSlugEdited] = useState(!!id);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<
    'publish' | 'unpublish' | 'delete' | null
  >(null);
  const [preview, setPreview] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!id) return;
    let active = true;
    void (async () => {
      try {
        const found = remote
          ? await getPost(id)
          : listLocalPosts().find((item) => item.id === id);
        if (!active) return;
        if (!found) {
          setError('No encontramos esta entrada. Puede que se haya eliminado.');
          return;
        }
        setPost(found);
        setInput(found);
        setLoaded(true);
      } catch (e) {
        if (!active) return;
        setError(
          e instanceof Error ? e.message : 'No pudimos abrir la entrada.'
        );
      }
    })();
    return () => {
      active = false;
    };
  }, [id, remote]);
  useEffect(() => {
    if (!dirty) return;
    const unload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    const navigate = (event: MouseEvent) => {
      const anchor =
        event.target instanceof Element
          ? event.target.closest('a[href]')
          : null;
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        anchor.target === '_blank' ||
        anchor.origin !== window.location.origin ||
        anchor.href === window.location.href
      )
        return;
      if (
        !window.confirm(
          'Hay cambios sin guardar. ¿Quieres salir sin guardarlos?'
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', navigate, true);
    return () => {
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('click', navigate, true);
    };
  }, [dirty]);
  function update<K extends keyof PostInput>(key: K, value: PostInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setMessage('');
  }
  async function save(status = input.status) {
    setError('');
    setBusy(true);
    try {
      const saved = remote
        ? await savePost({ ...input, status }, post)
        : saveLocalPost({ ...input, status }, post);
      setPost(saved);
      setInput(saved);
      setDirty(false);
      setSlugEdited(true);
      setMessage(
        remote
          ? status === 'published'
            ? 'Entrada publicada. Tus cambios están guardados.'
            : 'Borrador guardado.'
          : status === 'published'
            ? 'Entrada guardada en el blog de vista previa local.'
            : 'Borrador guardado en este navegador.'
      );
      if (!id) router.replace(`/admin/posts/${saved.id}`);
      dialog.current?.close();
      setConfirm(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'No pudimos guardar la entrada.'
      );
      dialog.current?.close();
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  }
  function request(kind: 'publish' | 'unpublish' | 'delete') {
    setConfirm(kind);
    dialog.current?.showModal();
  }
  async function confirmAction() {
    if (confirm === 'delete' && post) {
      setBusy(true);
      try {
        if (remote) await deletePost(post);
        else deleteLocalPost(post);
        setDirty(false);
        dialog.current?.close();
        router.push('/admin');
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'No pudimos eliminar la entrada.'
        );
        dialog.current?.close();
      } finally {
        setBusy(false);
      }
    } else await save(confirm === 'publish' ? 'published' : 'draft');
  }
  async function cover(file?: File) {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      update('coverImage', await prepareEditorialImage(file, remote));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'No pudimos cargar la portada.'
      );
    } finally {
      setBusy(false);
    }
  }
  if (!loaded)
    return (
      <div className="admin-page">
        <Link href="/admin" className="text-link">
          <ArrowLeft size={15} /> Todas las entradas
        </Link>
        <p role={error ? 'alert' : 'status'} className="form-message">
          {error || 'Abriendo la entrada…'}
        </p>
      </div>
    );
  return (
    <div className="admin-page">
      <div className="editor-topline">
        <Link href="/admin" className="text-link">
          <ArrowLeft size={15} /> Todas las entradas
        </Link>
        <span className={`status-badge ${input.status}`}>
          {input.status === 'published'
            ? remote
              ? 'Publicada'
              : 'Publicada · local'
            : 'Borrador'}
        </span>
      </div>
      <header className="admin-page-heading editor-heading">
        <div>
          <span className="eyebrow">Dale voz a nuestra fundación</span>
          <h1>
            {id ? 'Tu historia' : 'Una nueva historia'}
            <span>.</span>
          </h1>
          <p>
            {dirty
              ? 'Tienes cambios sin guardar.'
              : post
                ? remote
                  ? 'Tus cambios están guardados.'
                  : 'Tus cambios están guardados en este navegador.'
                : 'Escribe a tu ritmo. Puedes guardar y continuar después.'}
          </p>
        </div>
      </header>
      <div className="editor-actions">
        <button
          type="button"
          className="button button-outline"
          onClick={() => setPreview((value) => !value)}
        >
          <Eye size={16} />
          {preview ? 'Volver a editar' : 'Vista previa'}
        </button>
        <button
          type="button"
          className="button button-outline"
          onClick={() => save()}
          disabled={busy}
        >
          <Save size={16} />
          {input.status === 'published'
            ? 'Guardar cambios'
            : 'Guardar borrador'}
        </button>
        <button
          type="button"
          className="button button-green"
          onClick={() =>
            request(input.status === 'published' ? 'unpublish' : 'publish')
          }
          disabled={busy}
        >
          {input.status === 'published'
            ? remote
              ? 'Volver a borrador'
              : 'Retirar de la vista previa'
            : remote
              ? 'Publicar entrada'
              : 'Publicar en vista previa'}
          <ArrowUpRight size={16} />
        </button>
      </div>
      <div className="editor-messages" aria-live="polite">
        {error && (
          <p className="form-message form-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="form-message success-message">
            <Check size={15} />
            {message}
          </p>
        )}
      </div>
      {preview ? (
        <section className="editor-preview">
          <span className="eyebrow">Vista previa · {input.category}</span>
          <h1>{input.title || 'El título de tu historia'}</h1>
          <p>{input.excerpt}</p>
          {input.coverImage && (
            <img
              className="preview-cover"
              src={input.coverImage}
              alt={input.coverAlt}
            />
          )}
          <RichContent document={input.content} />
        </section>
      ) : (
        <div className="editor-grid">
          <div className="editor-writing">
            <label className="title-label">
              Título de la entrada
              <input
                className="title-input"
                value={input.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setInput((current) => ({
                    ...current,
                    title,
                    slug: slugEdited ? current.slug : slugify(title),
                  }));
                  setDirty(true);
                  setMessage('');
                }}
                maxLength={180}
                placeholder="Una historia que merece ser contada…"
              />
            </label>
            <label className="excerpt-label">
              Resumen para el blog
              <textarea
                value={input.excerpt}
                onChange={(e) => update('excerpt', e.target.value)}
                placeholder="Una breve introducción para invitar a leer tu historia."
                maxLength={350}
                rows={3}
              />
              <span className="field-help">
                {input.excerpt.length}/350 caracteres
              </span>
            </label>
            <span className="field-label">Contenido</span>
            <RichEditor
              initial={input.content}
              onChange={(document) => update('content', document)}
            />
            <div className="editor-wordcount">
              {documentText(input.content).split(/\s+/).filter(Boolean).length}{' '}
              palabras · Ctrl/Cmd + B para negrita
            </div>
          </div>
          <aside className="editor-settings">
            <section>
              <h2>Detalles de la entrada</h2>
              <label>
                Categoría
                <select
                  value={input.category}
                  onChange={(e) => update('category', e.target.value)}
                >
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label>
                Dirección de la entrada
                <input
                  value={input.slug}
                  onChange={(e) => {
                    setSlugEdited(true);
                    update('slug', e.target.value);
                  }}
                  maxLength={100}
                  placeholder="mi-primera-historia"
                />
                <span className="field-help">
                  /blog/{input.slug || 'tu-historia'}
                </span>
              </label>
            </section>
            <section>
              <h2>Imagen de portada</h2>
              {input.coverImage ? (
                <div className="cover-editor">
                  <img
                    src={input.coverImage}
                    alt={input.coverAlt || 'Vista previa de la portada'}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      update('coverImage', '');
                      update('coverAlt', '');
                    }}
                    aria-label="Quitar portada"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label className="cover-picker">
                  <ImagePlus size={24} />
                  <span>Seleccionar imagen</span>
                  <small>JPG, PNG o WebP · hasta 10 MB</small>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={busy}
                    onChange={(e) => {
                      void cover(e.target.files?.[0]);
                      e.currentTarget.value = '';
                    }}
                  />
                </label>
              )}
              <label>
                Descripción de la portada
                <input
                  value={input.coverAlt}
                  onChange={(e) => update('coverAlt', e.target.value)}
                  placeholder="¿Qué aparece en la imagen?"
                  maxLength={250}
                />
              </label>
            </section>
            <section className="editor-tip">
              <span className="eyebrow">Un pequeño consejo</span>
              <p>
                Escribe como si estuvieras compartiendo esta historia con
                alguien cercano. Los pequeños detalles también son luz.
              </p>
            </section>
            {post && (
              <button
                type="button"
                onClick={() => request('delete')}
                className="delete-post"
              >
                <Trash2 size={15} /> Eliminar entrada
              </button>
            )}
          </aside>
        </div>
      )}
      <dialog
        className="editor-dialog"
        ref={dialog}
        onCancel={() => setConfirm(null)}
      >
        <button
          type="button"
          className="dialog-close"
          aria-label="Cerrar"
          onClick={() => dialog.current?.close()}
        >
          <X size={19} />
        </button>
        <span className="eyebrow">Revisemos antes de continuar</span>
        <h2>
          {confirm === 'delete'
            ? '¿Eliminar esta historia?'
            : confirm === 'publish'
              ? '¿Compartir esta historia?'
              : '¿Volver a borrador?'}
        </h2>
        <p>
          {confirm === 'delete'
            ? 'Esta acción elimina la entrada y no se puede deshacer. Puedes exportar una copia desde el panel antes de eliminarla.'
            : confirm === 'publish'
              ? remote
                ? 'La entrada aparecerá en el blog público de este entorno. Revisa el contenido y las imágenes antes de confirmar.'
                : 'La entrada aparecerá en el blog de vista previa de este navegador. Todavía no se publicará en Internet.'
              : 'La entrada dejará de aparecer en el blog, pero podrás seguir editándola.'}
        </p>
        <div className="button-row">
          <button
            type="button"
            className="button button-outline"
            onClick={() => dialog.current?.close()}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="button button-green"
            onClick={confirmAction}
            disabled={busy}
          >
            {confirm === 'delete' ? 'Eliminar' : 'Confirmar'}
          </button>
        </div>
      </dialog>
    </div>
  );
}
