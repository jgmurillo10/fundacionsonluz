import assert from 'node:assert/strict';

const base = process.env.SONLUZ_SITE_TEST_URL || 'http://127.0.0.1:3005';
const loopback = ['localhost', '127.0.0.1', '[::1]'];
if (
  !loopback.includes(new URL(base).hostname) ||
  !loopback.includes(new URL(process.env.SONLUZ_CMS_URL || '').hostname)
)
  throw new Error(
    'Esta prueba solo puede ejecutarse contra el sitio y Worker locales.'
  );
const password = process.env.SONLUZ_ADMIN_PASSWORD;
if (!password || !process.env.SONLUZ_ADMIN_EMAIL)
  throw new Error(
    'SONLUZ_ADMIN_EMAIL y SONLUZ_ADMIN_PASSWORD deben estar disponibles para la prueba local.'
  );

let cookie = '';
let id;
const slug = `prueba-de-sonluz-${Date.now()}`;
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a+U8AAAAASUVORK5CYII=',
  'base64'
);
const draft = {
  title: 'Prueba local Son Luz',
  slug,
  excerpt: 'Solo una prueba aislada del CMS.',
  content: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'La fundación comparte historias.' }],
      },
    ],
  },
  category: 'Noticias',
  status: 'draft',
  coverImage: '',
  coverAlt: '',
};
const call = (
  path,
  { method = 'GET', body, authenticated = true, headers = {} } = {}
) =>
  fetch(`${base}${path}`, {
    method,
    redirect: 'manual',
    headers: {
      ...(method === 'GET' ? {} : { Origin: base }),
      ...(authenticated && cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body:
      body === undefined
        ? undefined
        : typeof body === 'string' || body instanceof Uint8Array
          ? body
          : JSON.stringify(body),
  });

try {
  assert.equal((await call('/admin', { authenticated: false })).status, 307);
  for (const [path, method, body] of [
    ['/api/editor/posts/00000000-0000-0000-0000-000000000000', 'GET'],
    ['/api/editor/posts/00000000-0000-0000-0000-000000000000', 'PUT', draft],
    [
      '/api/editor/posts/00000000-0000-0000-0000-000000000000',
      'DELETE',
      { revision: 1 },
    ],
    ['/api/editor/media', 'POST', png],
    ['/api/editor/session', 'DELETE'],
  ]) {
    assert.equal(
      (await call(path, { method, body, authenticated: false })).status,
      401
    );
  }
  assert.equal(
    (
      await call('/api/editor/posts', {
        method: 'POST',
        body: draft,
        authenticated: false,
      })
    ).status,
    401
  );
  assert.equal(
    (await call('/media/00000000-0000-0000-0000-000000000000.png')).status,
    404
  );
  assert.equal(
    (
      await call('/api/editor/session', {
        method: 'POST',
        body: { email: process.env.SONLUZ_ADMIN_EMAIL, password: 'incorrecta' },
        authenticated: false,
      })
    ).status,
    401
  );
  const login = await call('/api/editor/session', {
    method: 'POST',
    body: { email: process.env.SONLUZ_ADMIN_EMAIL, password },
    authenticated: false,
  });
  assert.equal(login.status, 200);
  cookie = login.headers.get('set-cookie')?.split(';')[0] || '';
  assert.ok(
    cookie.startsWith('sonluz-editor='),
    'No recibimos la sesión editorial.'
  );
  assert.equal((await call('/admin')).status, 200);
  assert.equal(
    (
      await call('/api/editor/posts', {
        method: 'POST',
        body: draft,
        headers: { Origin: 'https://other.test' },
      })
    ).status,
    403
  );
  assert.equal((await call(`/blog/${slug}`)).status, 404);

  const upload = await call('/api/editor/media', {
    method: 'POST',
    body: png,
    headers: { 'Content-Type': 'image/png' },
  });
  assert.equal(upload.status, 201);
  const { src } = await upload.json();
  assert.match(src, /^\/media\/[0-9a-f-]{36}\.png$/);
  assert.equal((await call(src, { authenticated: false })).status, 404);
  assert.equal((await call(src)).status, 200);

  const created = await call('/api/editor/posts', {
    method: 'POST',
    body: { ...draft, coverImage: src, coverAlt: 'Imagen de prueba local' },
    headers: { 'Content-Type': 'application/json' },
  });
  assert.equal(created.status, 201);
  const post = await created.json();
  id = post.id;
  assert.equal(post.revision, 1);
  assert.equal(
    (
      await call('/api/editor/posts', {
        method: 'POST',
        body: draft,
        headers: { 'Content-Type': 'application/json' },
      })
    ).status,
    409
  );
  assert.equal((await call(`/blog/${slug}`)).status, 404);
  assert.equal((await call(src, { authenticated: false })).status, 404);

  const published = await call(`/api/editor/posts/${id}`, {
    method: 'PUT',
    body: {
      ...draft,
      coverImage: src,
      coverAlt: 'Imagen de prueba local',
      status: 'published',
      revision: 1,
    },
    headers: { 'Content-Type': 'application/json' },
  });
  if (published.status !== 200)
    throw new Error(
      `No se pudo publicar (HTTP ${published.status}): ${await published.text()}`
    );
  assert.equal((await published.json()).revision, 2);
  assert.equal((await call(`/blog/${slug}`)).status, 200);
  assert.equal((await call(src, { authenticated: false })).status, 200);
  assert.match(await (await call('/sitemap.xml')).text(), new RegExp(slug));
  assert.equal(
    (
      await call(`/api/editor/posts/${id}`, {
        method: 'PUT',
        body: { ...draft, revision: 1 },
        headers: { 'Content-Type': 'application/json' },
      })
    ).status,
    409
  );

  const unpublished = await call(`/api/editor/posts/${id}`, {
    method: 'PUT',
    body: {
      ...draft,
      coverImage: src,
      coverAlt: 'Imagen de prueba local',
      revision: 2,
    },
    headers: { 'Content-Type': 'application/json' },
  });
  assert.equal(unpublished.status, 200);
  assert.equal((await unpublished.json()).revision, 3);
  assert.equal((await call(`/blog/${slug}`)).status, 404);
  assert.equal((await call(src, { authenticated: false })).status, 404);
  assert.doesNotMatch(
    await (await call('/sitemap.xml')).text(),
    new RegExp(slug)
  );
  assert.equal(
    (
      await call(`/api/editor/posts/${id}`, {
        method: 'DELETE',
        body: { revision: 3 },
        headers: { 'Content-Type': 'application/json' },
      })
    ).status,
    200
  );
  id = undefined;
  assert.equal(
    (await call('/api/editor/session', { method: 'DELETE' })).status,
    200
  );
  cookie = '';
  assert.equal((await call('/api/editor/posts')).status, 401);
  console.log(
    'Local Worker + Next.js HTTP CRUD, login/logout, media privacy and publish/unpublish: passed.'
  );
} finally {
  if (id && cookie) {
    const response = await call(`/api/editor/posts/${id}`);
    if (response.ok) {
      const post = await response.json();
      await call(`/api/editor/posts/${id}`, {
        method: 'DELETE',
        body: { revision: post.revision },
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
}
