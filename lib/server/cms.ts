import 'server-only';
import { HttpError } from '../request-body';
import type { Post } from '../blog';
import { cache } from 'react';

export function cmsConfigured() {
  try {
    const url = new URL(process.env.SONLUZ_CMS_URL || '');
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    return (
      (url.protocol === 'https:' || (local && url.protocol === 'http:')) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === '/' &&
      (process.env.SONLUZ_WORKER_SECRET?.length || 0) >= 32
    );
  } catch {
    return false;
  }
}

export async function cmsFetch(path: string, init: RequestInit = {}) {
  if (!cmsConfigured())
    throw new HttpError(503, 'El blog todavía no está configurado.');
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${process.env.SONLUZ_WORKER_SECRET}`);
  return fetch(new URL(path, process.env.SONLUZ_CMS_URL), {
    ...init,
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  });
}

export async function cmsJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await cmsFetch(path, init);
  const body = await response.json();
  if (!response.ok)
    throw new HttpError(
      response.status,
      body.error || 'No pudimos completar la operación.'
    );
  return body;
}

export async function publishedPosts(): Promise<Post[]> {
  return cmsConfigured() ? cmsJson('/posts?status=published') : [];
}

export const publishedPost = cache(
  async (slug: string): Promise<Post | null> => {
    if (!cmsConfigured()) return null;
    try {
      return await cmsJson(`/posts/slug/${encodeURIComponent(slug)}`);
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) return null;
      throw error;
    }
  }
);
