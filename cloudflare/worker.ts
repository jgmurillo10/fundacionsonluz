import {
  postSchema,
  storedPostSchema,
  type Post,
  type PostInput,
  type RichNode,
} from '../lib/blog';
import { HttpError, readBody, readJson } from '../lib/request-body';
import { analyticsDomains, parseAnalyticsEvent } from '../lib/analytics';
import type {
  AnalyticsEngineDataset,
  D1Database,
  R2Bucket,
  RateLimit,
} from '@cloudflare/workers-types';

type Env = {
  BLOG_DB: D1Database;
  BLOG_MEDIA: R2Bucket;
  SONLUZ_WORKER_SECRET: string;
  LOGIN_RATE_LIMITER: RateLimit;
  PUBLIC_ANALYTICS: AnalyticsEngineDataset;
  ANALYTICS_RATE_LIMITER: RateLimit;
  SONLUZ_ANALYTICS_ENABLED?: string;
  SONLUZ_ANALYTICS_SITE_URL?: string;
};

type Row = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  cover_alt: string;
  category: string;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
  published_at: string | null;
  revision: number;
};

const mediaKey = /^[0-9a-f-]{36}\.(?:jpg|png|webp)$/;
const jsonHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: jsonHeaders });
}

function toPost(row: Row): Post {
  return storedPostSchema.parse({
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: JSON.parse(row.content),
    coverImage: row.cover_image,
    coverAlt: row.cover_alt,
    category: row.category,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    revision: row.revision,
  });
}

function mediaKeys(input: PostInput): string[] {
  const sources: string[] = [input.coverImage];
  function walk(node: RichNode) {
    if (node.type === 'image' && typeof node.attrs?.src === 'string')
      sources.push(node.attrs.src);
    node.content?.forEach(walk);
  }
  walk(input.content);
  if (sources.some((src) => src.startsWith('data:')))
    throw new Error('Sube las imágenes antes de guardar la entrada.');
  return [
    ...new Set(
      sources
        .filter((src) => src.startsWith('/media/'))
        .map((src) => src.slice(7))
    ),
  ];
}

async function validateMedia(db: D1Database, keys: string[]) {
  for (const key of keys) {
    if (
      !mediaKey.test(key) ||
      !(await db
        .prepare('SELECT key FROM sonluz_media WHERE key = ?')
        .bind(key)
        .first())
    )
      throw new Error('Una imagen ya no está disponible. Vuelve a subirla.');
  }
}

async function authorized(request: Request, secret: string) {
  const supplied = request.headers.get('authorization');
  if (!secret || secret.length < 32 || !supplied?.startsWith('Bearer '))
    return false;
  const [expected, actual] = await Promise.all(
    [secret, supplied.slice(7)].map(
      async (value) =>
        new Uint8Array(
          await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
        )
    )
  );
  let difference = 0;
  for (let index = 0; index < expected.length; index++)
    difference |= expected[index] ^ actual[index];
  return difference === 0;
}

async function listPosts(db: D1Database, published: boolean) {
  const { results } = await db
    .prepare(
      `SELECT * FROM sonluz_posts ${published ? "WHERE status = 'published'" : ''}
     ORDER BY ${published ? 'published_at' : 'updated_at'} DESC`
    )
    .all<Row>();
  return results.map(toPost);
}

async function getPost(db: D1Database, id: string) {
  const row = await db
    .prepare('SELECT * FROM sonluz_posts WHERE id = ?')
    .bind(id)
    .first<Row>();
  return row ? toPost(row) : null;
}

function imageType(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return 'image/jpeg';
  if (
    bytes.length >= 8 &&
    bytes
      .slice(0, 8)
      .every((byte, index) => byte === [137, 80, 78, 71, 13, 10, 26, 10][index])
  )
    return 'image/png';
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  )
    return 'image/webp';
  return null;
}

async function upload(request: Request, env: Env) {
  const length = Number(request.headers.get('content-length'));
  if (length > 10 * 1024 * 1024)
    return json({ error: 'Imagen demasiado grande.' }, 413);
  const bytes = await readBody(request, 10 * 1024 * 1024);
  if (!bytes.length || bytes.length > 10 * 1024 * 1024)
    return json({ error: 'Imagen demasiado grande.' }, 413);
  const type = imageType(bytes);
  if (!type || type !== request.headers.get('content-type'))
    return json({ error: 'Solo se admiten imágenes JPG, PNG y WebP.' }, 400);
  const key = `${crypto.randomUUID()}.${type === 'image/jpeg' ? 'jpg' : type.split('/')[1]}`;
  await env.BLOG_MEDIA.put(key, bytes, { httpMetadata: { contentType: type } });
  try {
    await env.BLOG_DB.prepare(
      'INSERT INTO sonluz_media (key, content_type, size_bytes, created_at) VALUES (?, ?, ?, ?)'
    )
      .bind(key, type, bytes.length, new Date().toISOString())
      .run();
  } catch (error) {
    await env.BLOG_MEDIA.delete(key);
    throw error;
  }
  return json({ src: `/media/${key}` }, 201);
}

async function serveMedia(request: Request, env: Env, key: string) {
  if (!mediaKey.test(key)) return json({ error: 'No encontrado.' }, 404);
  const editor = request.headers.get('x-sonluz-editor') === '1';
  const row = await env.BLOG_DB.prepare(
    `SELECT m.content_type FROM sonluz_media m WHERE m.key = ? AND
     (${
       editor
         ? '1 = 1'
         : `EXISTS (
       SELECT 1 FROM sonluz_post_media pm JOIN sonluz_posts p ON p.id = pm.post_id
       WHERE pm.media_key = m.key AND p.status = 'published'
         AND (p.cover_image = ? OR instr(p.content, json_quote(?)) > 0)
     )`
     })`
  )
    .bind(...(editor ? [key] : [key, `/media/${key}`, `/media/${key}`]))
    .first<{ content_type: string }>();
  if (!row) return json({ error: 'No encontrado.' }, 404);
  const object = await env.BLOG_MEDIA.get(key);
  if (!object) return json({ error: 'No encontrado.' }, 404);
  return new Response(object.body as unknown as ReadableStream<Uint8Array>, {
    headers: {
      'Content-Type': row.content_type,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    },
  });
}

async function savePost(request: Request, env: Env, id?: string) {
  const body = await readJson(request);
  const result = postSchema.safeParse(body);
  if (!result.success)
    return json({ error: result.error.issues[0].message }, 400);
  const input = result.data;
  try {
    const keys = mediaKeys(input);
    await validateMedia(env.BLOG_DB, keys);
  } catch (error) {
    return json({ error: (error as Error).message }, 400);
  }
  const now = new Date().toISOString();
  try {
    if (!id) {
      const postId = crypto.randomUUID();
      await env.BLOG_DB.prepare(
        `INSERT INTO sonluz_posts
          (id,title,slug,excerpt,content,cover_image,cover_alt,category,status,created_at,updated_at,published_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
      )
        .bind(
          postId,
          input.title,
          input.slug,
          input.excerpt,
          JSON.stringify(input.content),
          input.coverImage,
          input.coverAlt,
          input.category,
          input.status,
          now,
          now,
          input.status === 'published' ? now : null
        )
        .run();
      return json(await getPost(env.BLOG_DB, postId), 201);
    }
    const expected =
      typeof body === 'object' && body !== null && 'revision' in body
        ? Number(body.revision)
        : NaN;
    if (!Number.isSafeInteger(expected) || expected < 1)
      return json(
        { error: 'Falta la versión de la entrada. Recarga la página.' },
        400
      );
    const previous = await getPost(env.BLOG_DB, id);
    if (!previous) return json({ error: 'No encontrado.' }, 404);
    const changed = await env.BLOG_DB.prepare(
      `UPDATE sonluz_posts SET
      title=?,slug=?,excerpt=?,content=?,cover_image=?,cover_alt=?,category=?,status=?,
      updated_at=?,published_at=?,revision=revision+1 WHERE id=? AND revision=?`
    )
      .bind(
        input.title,
        input.slug,
        input.excerpt,
        JSON.stringify(input.content),
        input.coverImage,
        input.coverAlt,
        input.category,
        input.status,
        new Date(
          Math.max(Date.now(), Date.parse(previous.updatedAt) + 1)
        ).toISOString(),
        input.status === 'published' ? previous.publishedAt || now : null,
        id,
        expected
      )
      .run();
    if (changed.meta.changes === 0)
      return json(
        { error: 'Esta entrada cambió. Recarga antes de guardar.' },
        409
      );
    return json(await getPost(env.BLOG_DB, id));
  } catch (error) {
    if (String(error).includes('UNIQUE constraint failed: sonluz_posts.slug'))
      return json({ error: 'Otra entrada ya utiliza esa dirección.' }, 409);
    throw error;
  }
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!(await authorized(request, env.SONLUZ_WORKER_SECRET)))
      return json({ error: 'No autorizado.' }, 401);
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    try {
      if (url.pathname === '/analytics/events' && request.method === 'POST') {
        if (env.SONLUZ_ANALYTICS_ENABLED !== '1' || !env.PUBLIC_ANALYTICS)
          return json({ error: 'Analítica desactivada.' }, 503);
        const body = await readJson(request, 1024);
        if (!body || typeof body !== 'object' || Array.isArray(body))
          return json({ error: 'Evento inválido.' }, 400);
        const { hostname, ...input } = body as Record<string, unknown>;
        const event = parseAnalyticsEvent(input);
        const domains = analyticsDomains(
          env.SONLUZ_ANALYTICS_SITE_URL || 'https://fundacionsonluz.com'
        );
        if (
          !event ||
          typeof hostname !== 'string' ||
          !domains?.includes(hostname)
        )
          return json({ error: 'Evento inválido.' }, 400);
        const { success } = await env.ANALYTICS_RATE_LIMITER.limit({
          key: domains[0],
        });
        if (!success) return json({ error: 'Demasiados eventos.' }, 429);
        env.PUBLIC_ANALYTICS.writeDataPoint({
          indexes: [domains[0]],
          blobs: [
            'v1',
            hostname,
            event.type,
            event.path,
            event.type === 'click' ? event.action : '',
          ],
          doubles: [1],
        });
        return json({ accepted: true }, 202);
      }
      if (url.pathname === '/auth/attempt' && request.method === 'POST') {
        const body = (await readJson(request, 4096)) as { key?: string };
        if (
          !body ||
          typeof body.key !== 'string' ||
          !/^[a-f0-9]{64}$/.test(body.key)
        )
          return json({ error: 'Solicitud inválida.' }, 400);
        const { success } = await env.LOGIN_RATE_LIMITER.limit({
          key: body.key,
        });
        return success
          ? json({ allowed: true })
          : json({ error: 'Demasiados intentos. Espera un minuto.' }, 429);
      }
      if (parts[0] === 'posts' && parts.length === 1) {
        if (request.method === 'GET')
          return json(
            await listPosts(
              env.BLOG_DB,
              url.searchParams.get('status') === 'published'
            )
          );
        if (request.method === 'POST') return await savePost(request, env);
      }
      if (parts[0] === 'posts' && parts.length === 2) {
        const id = parts[1];
        if (!/^[0-9a-f-]{36}$/.test(id))
          return json({ error: 'No encontrado.' }, 404);
        if (request.method === 'GET') {
          const post = await getPost(env.BLOG_DB, id);
          return post ? json(post) : json({ error: 'No encontrado.' }, 404);
        }
        if (request.method === 'PUT') return await savePost(request, env, id);
        if (request.method === 'DELETE') {
          const body = (await readJson(request, 4096)) as { revision?: number };
          if (!Number.isSafeInteger(body?.revision) || (body.revision || 0) < 1)
            return json({ error: 'Falta la versión de la entrada.' }, 400);
          const removed = await env.BLOG_DB.prepare(
            'DELETE FROM sonluz_posts WHERE id = ? AND revision = ?'
          )
            .bind(id, body.revision)
            .run();
          return removed.meta.changes > 0
            ? json({ deleted: true })
            : json(
                { error: 'Esta entrada cambió. Recarga antes de eliminarla.' },
                409
              );
        }
      }
      if (
        parts[0] === 'posts' &&
        parts[1] === 'slug' &&
        parts.length === 3 &&
        request.method === 'GET'
      ) {
        const row = await env.BLOG_DB.prepare(
          "SELECT * FROM sonluz_posts WHERE slug = ? AND status = 'published'"
        )
          .bind(parts[2])
          .first<Row>();
        return row ? json(toPost(row)) : json({ error: 'No encontrado.' }, 404);
      }
      if (
        parts[0] === 'media' &&
        parts.length === 1 &&
        request.method === 'POST'
      )
        return await upload(request, env);
      if (
        parts[0] === 'media' &&
        parts.length === 2 &&
        request.method === 'GET'
      )
        return await serveMedia(request, env, parts[1]);
      return json({ error: 'No encontrado.' }, 404);
    } catch (error) {
      if (error instanceof HttpError)
        return json({ error: error.message }, error.status);
      console.error('Blog Worker request failed.');
      return json({ error: 'No pudimos completar la operación.' }, 500);
    }
  },
};
export default worker;
