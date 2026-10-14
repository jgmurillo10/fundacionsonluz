import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import worker from '../cloudflare/worker';
import type { Post, PostInput } from '../lib/blog';

const input: PostInput = {
  title: 'Encuentro Son Luz',
  slug: 'encuentro-son-luz',
  excerpt: 'Una historia de la fundación.',
  content: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Nuestra historia.' }],
      },
    ],
  },
  coverImage: '',
  coverAlt: '',
  category: 'Noticias',
  status: 'draft',
};
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a+U8AAAAASUVORK5CYII=',
  'base64'
);

describe('Worker CRUD with SQLite migrations and private R2', () => {
  let db: DatabaseSync;
  let secret: string;
  let env: Parameters<typeof worker.fetch>[1];
  let objects: Map<string, Uint8Array>;
  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON');
    for (const name of [
      '0001_blog.sql',
      '0002_media_references.sql',
      '0003_strict_media_references.sql',
    ])
      db.exec(
        readFileSync(
          new URL(`../cloudflare/migrations/${name}`, import.meta.url),
          'utf8'
        )
      );
    objects = new Map();
    secret = randomBytes(32).toString('hex');
    const attempts = new Map<string, number>();
    env = {
      SONLUZ_WORKER_SECRET: secret,
      BLOG_DB: {
        prepare(sql: string) {
          let values: (string | number | null)[] = [];
          const prepared = {
            bind(...params: typeof values) {
              values = params;
              return prepared;
            },
            async first() {
              return db.prepare(sql).get(...values) || null;
            },
            async all() {
              return { results: db.prepare(sql).all(...values) };
            },
            async run() {
              const before = Number(
                db.prepare('SELECT total_changes() AS count').get()!.count
              );
              db.prepare(sql).run(...values);
              const after = Number(
                db.prepare('SELECT total_changes() AS count').get()!.count
              );
              return {
                meta: {
                  changes: after - before,
                },
              };
            },
          };
          return prepared;
        },
      },
      BLOG_MEDIA: {
        async put(key: string, data: Uint8Array) {
          objects.set(key, new Uint8Array(data));
        },
        async delete(key: string) {
          objects.delete(key);
        },
        async get(key: string) {
          const bytes = objects.get(key);
          return bytes
            ? {
                body: new ReadableStream({
                  start(controller) {
                    controller.enqueue(bytes);
                    controller.close();
                  },
                }),
              }
            : null;
        },
      },
      LOGIN_RATE_LIMITER: {
        async limit({ key }: { key: string }) {
          const count = (attempts.get(key) || 0) + 1;
          attempts.set(key, count);
          return { success: count <= 5 };
        },
      },
    } as unknown as typeof env;
  });
  afterEach(() => db.close());
  const call = (
    path: string,
    method = 'GET',
    body?: unknown,
    headers: Record<string, string> = {}
  ) =>
    worker.fetch(
      new Request(`https://worker.test${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
      env
    );
  const create = async (data = input): Promise<Post> => {
    const response = await call('/posts', 'POST', data);
    expect(response.status).toBe(201);
    return response.json();
  };
  const upload = () =>
    worker.fetch(
      new Request('https://worker.test/media', {
        method: 'POST',
        body: png,
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'image/png',
        },
      }),
      env
    );

  it('requires server authorization for every endpoint and fails closed without a secret', async () => {
    for (const path of ['/posts', '/media', '/auth/attempt'])
      expect(
        (await call(path, 'POST', input, { Authorization: '' })).status
      ).toBe(401);
    env.SONLUZ_WORKER_SECRET = '';
    expect((await call('/posts')).status).toBe(401);
  });
  it('creates, reads, updates, publishes, unpublishes and deletes with revision checks', async () => {
    const post = await create();
    expect(post.revision).toBe(1);
    expect(await (await call('/posts?status=published')).json()).toEqual([]);
    expect((await call(`/posts/slug/${post.slug}`)).status).toBe(404);
    expect((await call(`/posts/${post.id}`)).status).toBe(200);
    const published = (await (
      await call(`/posts/${post.id}`, 'PUT', {
        ...input,
        status: 'published',
        revision: 1,
      })
    ).json()) as Post;
    expect(published.revision).toBe(2);
    expect(published.publishedAt).not.toBeNull();
    expect((await call(`/posts/slug/${post.slug}`)).status).toBe(200);
    expect(
      (await call(`/posts/${post.id}`, 'PUT', { ...input, revision: 1 })).status
    ).toBe(409);
    expect(
      (await call(`/posts/${post.id}`, 'DELETE', { revision: 1 })).status
    ).toBe(409);
    const draft = (await (
      await call(`/posts/${post.id}`, 'PUT', { ...input, revision: 2 })
    ).json()) as Post;
    expect(draft.publishedAt).toBeNull();
    expect((await call(`/posts/slug/${post.slug}`)).status).toBe(404);
    expect(
      (await call(`/posts/${post.id}`, 'DELETE', { revision: draft.revision }))
        .status
    ).toBe(200);
    expect((await call(`/posts/${post.id}`)).status).toBe(404);
  });
  it('rejects duplicate slugs and concurrent stale writes', async () => {
    const post = await create();
    expect((await call('/posts', 'POST', input)).status).toBe(409);
    const results = await Promise.all(
      ['Primer cambio', 'Segundo cambio'].map((title) =>
        call(`/posts/${post.id}`, 'PUT', { ...input, title, revision: 1 })
      )
    );
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    expect((await call(`/posts/${post.id}`, 'PUT', input)).status).toBe(400);
  });
  it('keeps unattached and draft media private, atomically links media, and revokes access on unpublish/delete', async () => {
    const uploaded = await upload();
    expect(uploaded.status).toBe(201);
    const { src } = (await uploaded.json()) as { src: string };
    expect((await call(src)).status).toBe(404);
    expect(
      (await call(src, 'GET', undefined, { 'x-sonluz-editor': '1' })).status
    ).toBe(200);
    const post = await create({
      ...input,
      coverImage: src,
      coverAlt: 'Encuentro de la fundación',
    });
    expect((await call(src)).status).toBe(404);
    await call(`/posts/${post.id}`, 'PUT', { ...post, status: 'published' });
    const publicImage = await call(src);
    expect(publicImage.status).toBe(200);
    expect(publicImage.headers.get('Cache-Control')).toBe('no-store');
    expect(new Uint8Array(await publicImage.arrayBuffer())).toEqual(
      new Uint8Array(png)
    );
    expect(
      (
        await call(`/posts/${post.id}`, 'PUT', {
          ...post,
          coverImage: '',
          coverAlt: '',
        })
      ).status
    ).toBe(409);
    expect((await call(src)).status).toBe(200);
    await call(`/posts/${post.id}`, 'PUT', {
      ...post,
      revision: 2,
      status: 'draft',
    });
    expect((await call(src)).status).toBe(404);
    await call(`/posts/${post.id}`, 'PUT', {
      ...post,
      revision: 3,
      status: 'published',
    });
    await call(`/posts/${post.id}`, 'DELETE', { revision: 4 });
    expect((await call(src)).status).toBe(404);
    expect(
      db.prepare('SELECT COUNT(*) AS count FROM sonluz_post_media').get()?.count
    ).toBe(0);
  });
  it('links inline images as well as covers and removes obsolete references', async () => {
    const { src } = (await (await upload()).json()) as { src: string };
    const post = await create({
      ...input,
      status: 'published',
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Nuestra fundación.' }],
          },
          { type: 'image', attrs: { src, alt: 'Nuestra fundación' } },
        ],
      },
    });
    expect((await call(src)).status).toBe(200);
    await call(`/posts/${post.id}`, 'PUT', {
      ...input,
      status: 'published',
      revision: 1,
    });
    expect((await call(src)).status).toBe(404);
  });
  it('does not expose draft media merely mentioned in a published article', async () => {
    const { src } = (await (await upload()).json()) as { src: string };
    await create({
      ...input,
      status: 'published',
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: `No es una imagen: ${src}` }],
          },
        ],
      },
    });
    expect((await call(src)).status).toBe(404);
  });
  it('rejects malformed/unsafe rich documents, embedded images, missing alt text and nonexistent media', async () => {
    for (const bad of [
      {
        ...input,
        content: { type: 'html', text: '<script>alert(1)</script>' },
      },
      {
        ...input,
        coverImage: `data:image/png;base64,${png.toString('base64')}`,
        coverAlt: 'Imagen',
      },
      { ...input, coverImage: '/images/sonluz.png' },
      {
        ...input,
        coverImage: `/media/${crypto.randomUUID()}.png`,
        coverAlt: 'Imagen',
      },
      {
        ...input,
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'enlace',
                  marks: [
                    { type: 'link', attrs: { href: 'javascript:alert(1)' } },
                  ],
                },
              ],
            },
          ],
        },
      },
    ])
      expect((await call('/posts', 'POST', bad)).status).toBe(400);
  });
  it('rejects SVG, spoofed MIME, truncated headers, oversized bodies and malformed JSON', async () => {
    for (const [type, body] of [
      ['image/svg+xml', '<svg/>'],
      ['image/jpeg', png],
      ['image/png', Buffer.from([137])],
    ] as const) {
      const response = await worker.fetch(
        new Request('https://worker.test/media', {
          method: 'POST',
          body,
          headers: { Authorization: `Bearer ${secret}`, 'Content-Type': type },
        }),
        env
      );
      expect(response.status).toBe(400);
    }
    expect(
      (await call('/posts', 'POST', { ...input, title: 'a'.repeat(250_001) }))
        .status
    ).toBe(413);
    expect(
      (
        await worker.fetch(
          new Request('https://worker.test/posts', {
            method: 'POST',
            body: '{broken',
            headers: { Authorization: `Bearer ${secret}` },
          }),
          env
        )
      ).status
    ).toBe(400);
  });
  it('rate-limits login attempts through the protected binding', async () => {
    const data = { key: '1'.repeat(64) };
    for (let count = 0; count < 5; count++)
      expect((await call('/auth/attempt', 'POST', data)).status).toBe(200);
    expect((await call('/auth/attempt', 'POST', data)).status).toBe(429);
    expect((await call('/auth/attempt', 'POST', { key: '' })).status).toBe(400);
  });
});
