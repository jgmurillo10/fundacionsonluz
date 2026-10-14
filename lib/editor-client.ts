'use client';
import type { Post, PostInput } from './blog';
import { prepareLocalImage } from './image-upload';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/editor${path}`, {
    ...init,
    cache: 'no-store',
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error || 'No pudimos completar la operación.');
  return body;
}
export const listPosts = () => request<Post[]>('/posts');
export const getPost = (id: string) =>
  request<Post>(`/posts/${encodeURIComponent(id)}`);
export async function savePost(input: PostInput, current?: Post | null) {
  const post = await request<Post>(
    current ? `/posts/${current.id}` : '/posts',
    {
      method: current ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, revision: current?.revision }),
    }
  );
  window.dispatchEvent(new Event('sonluz:posts-changed'));
  return post;
}
export async function deletePost(post: Post) {
  await request(`/posts/${post.id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ revision: post.revision }),
  });
  window.dispatchEvent(new Event('sonluz:posts-changed'));
}
export async function prepareEditorialImage(file: File, remote: boolean) {
  const local = await prepareLocalImage(file);
  if (!remote) return local;
  const blob = await (await fetch(local)).blob();
  const { src } = await request<{ src: string }>('/media', {
    method: 'POST',
    headers: { 'Content-Type': blob.type },
    body: blob,
  });
  return src;
}
