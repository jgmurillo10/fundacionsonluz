import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  blankPost,
  deleteLocalPost,
  listLocalPosts,
  saveLocalPost,
  subscribeLocalPosts,
} from '../lib/local-posts';
import { localPreviewEnabled } from '../lib/local-preview';

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  vi.stubGlobal('window', new EventTarget());
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const draft = () => ({
  ...blankPost(),
  title: 'Primera historia',
  slug: 'primera-historia',
});
describe('Vista editorial local', () => {
  it('comienza sin historias inventadas', () => {
    expect(listLocalPosts()).toEqual([]);
  });
  it('crea, guarda y edita un borrador', () => {
    const post = saveLocalPost(draft());
    expect(post.status).toBe('draft');
    expect(post.publishedAt).toBeNull();
    const updated = saveLocalPost(
      { ...post, title: 'Una historia editada' },
      post
    );
    expect(updated.id).toBe(post.id);
    expect(updated.updatedAt > post.updatedAt).toBe(true);
    expect(listLocalPosts()).toHaveLength(1);
    expect(listLocalPosts()[0].title).toBe('Una historia editada');
  });
  it('publica y retira una historia sin eliminar el borrador', () => {
    const post = saveLocalPost({
      ...draft(),
      status: 'published',
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Una historia' }],
          },
        ],
      },
    });
    expect(post.publishedAt).toBeTruthy();
    expect(
      listLocalPosts().filter((post) => post.status === 'published')
    ).toHaveLength(1);
    const updated = saveLocalPost({ ...post, status: 'draft' }, post);
    expect(updated.publishedAt).toBeNull();
    expect(
      listLocalPosts().filter((post) => post.status === 'published')
    ).toHaveLength(0);
    expect(listLocalPosts()).toHaveLength(1);
  });
  it('evita direcciones duplicadas', () => {
    saveLocalPost(draft());
    expect(() => saveLocalPost(draft())).toThrow('dirección');
  });
  it('no sobrescribe ediciones realizadas en otra pestaña', () => {
    const first = saveLocalPost(draft());
    saveLocalPost({ ...first, title: 'Otro cambio' }, first);
    expect(() => saveLocalPost(first, first)).toThrow('otra pestaña');
    expect(() => deleteLocalPost(first)).toThrow('otra pestaña');
    expect(listLocalPosts()[0].title).toBe('Otro cambio');
  });
  it('elimina únicamente la entrada elegida', () => {
    const first = saveLocalPost(draft());
    saveLocalPost({ ...draft(), slug: 'segunda-historia' });
    deleteLocalPost(first);
    expect(listLocalPosts()).toHaveLength(1);
    expect(listLocalPosts()[0].slug).toBe('segunda-historia');
  });
  it('informa fallos de almacenamiento y no confirma guardado', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceeded');
      },
    });
    expect(() => saveLocalPost(draft())).toThrow('espacio');
  });
  it('no sobrescribe datos corruptos', () => {
    localStorage.setItem('sonluz:editorial-preview:v1', '{bad json');
    expect(() => saveLocalPost(draft())).toThrow('sobrescrito');
    expect(localStorage.getItem('sonluz:editorial-preview:v1')).toBe(
      '{bad json'
    );
  });
  it('notifica cambios y permite cancelar la suscripción', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeLocalPosts(listener);
    saveLocalPost(draft());
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    saveLocalPost({ ...draft(), slug: 'otra' });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
describe('Separación entre revisión local y producción', () => {
  it('requiere autorización explícita mediante configuración local', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('SONLUZ_LOCAL_PREVIEW', '0');
    expect(localPreviewEnabled()).toBe(false);
    vi.stubEnv('SONLUZ_LOCAL_PREVIEW', '1');
    expect(localPreviewEnabled()).toBe(true);
  });
  it('no permite habilitar el sandbox en producción', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SONLUZ_LOCAL_PREVIEW', '1');
    expect(localPreviewEnabled()).toBe(false);
  });
});
