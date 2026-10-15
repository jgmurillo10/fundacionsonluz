import assert from 'node:assert/strict';
import { request } from 'node:http';

const base = process.env.SONLUZ_SITE_TEST_URL || 'http://127.0.0.1:3005';
const loopback = ['localhost', '127.0.0.1', '[::1]'];
if (
  !loopback.includes(new URL(base).hostname) ||
  !loopback.includes(new URL(process.env.SONLUZ_CMS_URL || '').hostname)
)
  throw new Error('La prueba de analítica solo admite sitio y Worker locales.');
const origin = 'https://sonluz-test.example.test';
const event = { type: 'pageview', path: '/about' };
const send = (body = event, headers = {}) =>
  new Promise((resolve, reject) => {
    const req = request(
      new URL('/api/analytics', base),
      {
        method: 'POST',
        headers: {
          Host: new URL(origin).host,
          Origin: origin,
          Referer: `${origin}/about`,
          'X-Forwarded-Proto': 'https',
          'Sec-Fetch-Site': 'same-origin',
          'Content-Type': 'application/json',
          ...headers,
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () =>
          resolve(
            new Response(
              res.statusCode === 204 ? null : Buffer.concat(chunks),
              { status: res.statusCode }
            )
          )
        );
        res.on('error', reject);
      }
    );
    req.on('error', reject);
    req.setTimeout(5000, () => req.destroy(new Error('Local collector timeout.')));
    req.end(JSON.stringify(body));
  });

const accepted = await send();
assert.equal(accepted.status, 204, await accepted.text());
assert.equal(
  (await send({ type: 'click', path: '/about', action: 'nav_home' })).status,
  204
);
assert.equal(
  (await send(event, { Referer: `${origin}/admin/login` })).status,
  403
);
assert.equal(
  (await send(event, { Origin: 'https://other.example.test' })).status,
  403
);
assert.equal((await send({ type: 'pageview', path: '/admin' })).status, 400);
assert.equal(
  (await send({ ...event, email: 'private@example.test' })).status,
  400
);
assert.equal((await send({ padding: 'x'.repeat(1025) })).status, 413);
assert.equal((await send(event, { DNT: '1' })).status, 204);
assert.equal((await send(event, { 'Sec-GPC': '1' })).status, 204);
for (const [path, expected] of [
  ['/', true],
  ['/about', true],
  ['/admin/login', false],
]) {
  const html = await (await fetch(`${base}${path}`)).text();
  assert.equal(
    html.includes('\\"domains\\"') || html.includes('"domains"'),
    expected,
    `Tracker configuration on ${path}`
  );
  assert.ok(!html.includes('cloud.umami.is'));
}
assert.equal(
  (
    await fetch(`${process.env.SONLUZ_CMS_URL}/analytics/events`, {
      method: 'POST',
      body: JSON.stringify({ ...event, hostname: 'sonluz-test.example.test' }),
    })
  ).status,
  401
);
console.log(
  'Local Cloudflare analytics HTTP acceptance and public/admin isolation: passed. Remote Analytics Engine persistence/querying was not tested.'
);
