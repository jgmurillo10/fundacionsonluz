'use client';
import {
  emptyDocument,
  postSchema,
  storedPostSchema,
  type Post,
  type PostInput,
} from './blog';

const key = 'sonluz:editorial-preview:v1';
const event = 'sonluz:posts-changed';
export function listLocalPosts(): Post[] {
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      !Array.isArray(parsed) ||
      !parsed.every((post) => storedPostSchema.safeParse(post).success)
    )
      throw new Error();
    return parsed as Post[];
  } catch {
    throw new Error(
      'No pudimos leer tus entradas locales. No hemos sobrescrito los datos guardados.'
    );
  }
}
export function saveLocalPost(input: PostInput, current?: Post | null): Post {
  const result = postSchema.safeParse(input);
  if (!result.success) throw new Error(result.error.issues[0].message);
  const posts = listLocalPosts();
  if (posts.some((post) => post.slug === input.slug && post.id !== current?.id))
    throw new Error(
      'Otra entrada ya utiliza esa dirección. Elige una diferente.'
    );
  const previous = current
    ? posts.find((post) => post.id === current.id)
    : undefined;
  if (current && (!previous || previous.updatedAt !== current.updatedAt))
    throw new Error(
      'Esta entrada cambió en otra pestaña. Recarga antes de guardar para no perder esos cambios.'
    );
  const now = new Date(
    Math.max(Date.now(), previous ? Date.parse(previous.updatedAt) + 1 : 0)
  ).toISOString();
  const post: Post = {
    ...result.data,
    id: current?.id || crypto.randomUUID(),
    createdAt: current?.createdAt || now,
    updatedAt: now,
    publishedAt:
      input.status === 'published' ? current?.publishedAt || now : null,
  };
  try {
    localStorage.setItem(
      key,
      JSON.stringify([post, ...posts.filter((item) => item.id !== post.id)])
    );
  } catch {
    throw new Error(
      'El navegador no pudo guardar la entrada. Puede que no haya espacio: reduce las imágenes o exporta tus entradas.'
    );
  }
  window.dispatchEvent(new Event(event));
  return post;
}
export function deleteLocalPost(post: Post) {
  const posts = listLocalPosts();
  if (
    !posts.some(
      (item) => item.id === post.id && item.updatedAt === post.updatedAt
    )
  )
    throw new Error(
      'La entrada cambió en otra pestaña. Recarga antes de eliminarla.'
    );
  localStorage.setItem(
    key,
    JSON.stringify(posts.filter((item) => item.id !== post.id))
  );
  window.dispatchEvent(new Event(event));
}
export function subscribeLocalPosts(listener: () => void) {
  window.addEventListener('storage', listener);
  window.addEventListener(event, listener);
  return () => {
    window.removeEventListener('storage', listener);
    window.removeEventListener(event, listener);
  };
}
export function blankPost(): PostInput {
  return {
    title: '',
    slug: '',
    excerpt: '',
    content: emptyDocument,
    coverImage: '',
    coverAlt: '',
    category: 'Noticias',
    status: 'draft',
  };
}
