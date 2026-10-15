import 'server-only';
import { createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { z } from 'zod';
import { localPreviewEnabled } from '../local-preview';
import { cmsConfigured } from './cms';
import { HttpError } from '../request-body';

type EditorialSession = { email: string; version: string };

const adminSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  passwordHash: z.string().regex(/^[0-9a-f]{32}:[0-9a-f]{64}$/),
});
type EditorialAdmin = z.infer<typeof adminSchema>;

function configuredAdmins(): EditorialAdmin[] {
  try {
    const additional: unknown = JSON.parse(
      process.env.SONLUZ_ADDITIONAL_ADMINS || '[]'
    );
    if (!Array.isArray(additional)) return [];
    const admins = z.array(adminSchema).parse([
      {
        email: process.env.SONLUZ_ADMIN_EMAIL,
        passwordHash: process.env.SONLUZ_ADMIN_PASSWORD_HASH,
      },
      ...additional,
    ]);
    if (new Set(admins.map((admin) => admin.email)).size !== admins.length)
      return [];
    return admins;
  } catch {
    return [];
  }
}

export function authConfigured() {
  return (
    configuredAdmins().length > 0 &&
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
  const admin = configuredAdmins().find(({ email }) => email === session.email);
  return !!admin && session.version === sessionVersion(admin);
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

export async function verifyAdminCredentials(email: string, password: string) {
  const admins = configuredAdmins();
  const admin = admins.find(
    (candidate) => candidate.email === email.trim().toLowerCase()
  );
  const hash = admin?.passwordHash || admins[0]?.passwordHash;
  if (!hash) return null;
  const valid = await verifyPassword(password, hash);
  return valid && admin ? admin : null;
}

export function sessionVersion(admin: EditorialAdmin) {
  return createHash('sha256')
    .update(JSON.stringify([admin.email, admin.passwordHash]))
    .digest('hex');
}
