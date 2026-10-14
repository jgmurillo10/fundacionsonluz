import 'server-only';
import { createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { localPreviewEnabled } from '../local-preview';
import { cmsConfigured } from './cms';
import { HttpError } from '../request-body';

type EditorialSession = { email: string; version: string };

export function authConfigured() {
  return (
    !!process.env.SONLUZ_ADMIN_EMAIL &&
    /^[0-9a-f]{32}:[0-9a-f]{64}$/.test(
      process.env.SONLUZ_ADMIN_PASSWORD_HASH || ''
    ) &&
    (process.env.SONLUZ_SESSION_SECRET?.length || 0) >= 32
  );
}

export function localCmsPreview() {
  if (!localPreviewEnabled() || !cmsConfigured()) return false;
  return ['localhost', '127.0.0.1', '[::1]'].includes(
    new URL(process.env.SONLUZ_CMS_URL!).hostname
  );
}

export async function editorSession() {
  if (!authConfigured())
    throw new HttpError(
      503,
      'El acceso del equipo todavía no está configurado.'
    );
  return getIronSession<EditorialSession>(await cookies(), {
    password: process.env.SONLUZ_SESSION_SECRET!,
    cookieName: 'sonluz-editor',
    ttl: 12 * 60 * 60,
    cookieOptions: {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    },
  });
}

export async function canEdit() {
  if (!cmsConfigured()) return false;
  if (localCmsPreview()) return true;
  if (!authConfigured()) return false;
  const session = await editorSession();
  return (
    session.email === process.env.SONLUZ_ADMIN_EMAIL?.trim().toLowerCase() &&
    session.version ===
      createHash('sha256')
        .update(process.env.SONLUZ_ADMIN_PASSWORD_HASH!)
        .digest('hex')
  );
}

export async function requireEditor(request?: Request) {
  if (!(await canEdit()))
    throw new HttpError(401, 'Inicia sesión para continuar.');
  if (request && request.method !== 'GET') requireSameOrigin(request);
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  let sameOrigin = false;
  if (origin && host) {
    try {
      const supplied = new URL(origin);
      const expected = new URL(`${supplied.protocol}//${host}`);
      const protocol =
        request.headers.get('x-forwarded-proto') ||
        new URL(request.url).protocol.slice(0, -1);
      sameOrigin =
        origin === supplied.origin &&
        supplied.origin === expected.origin &&
        supplied.protocol.slice(0, -1) === protocol &&
        ['http:', 'https:'].includes(supplied.protocol);
    } catch {
      /* Malformed Origin or Host. */
    }
  }
  if (!sameOrigin || request.headers.get('sec-fetch-site') === 'cross-site')
    throw new HttpError(403, 'Solicitud no autorizada.');
}

export async function verifyPassword(password: string, stored: string) {
  if (!/^[0-9a-f]{32}:[0-9a-f]{64}$/.test(stored) || password.length > 128)
    return false;
  const [salt, expected] = stored.split(':');
  const actual = await new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, 32, (error, key) =>
      error ? reject(error) : resolve(key)
    )
  );
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}

export function sessionVersion() {
  return createHash('sha256')
    .update(process.env.SONLUZ_ADMIN_PASSWORD_HASH!)
    .digest('hex');
}
