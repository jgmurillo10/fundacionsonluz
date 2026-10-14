import { createHash } from 'node:crypto';
import {
  authConfigured,
  editorSession,
  requireEditor,
  requireSameOrigin,
  sessionVersion,
  verifyPassword,
} from '@/lib/server/editor-auth';
import { cmsJson } from '@/lib/server/cms';
import { api, json } from '@/lib/server/api';
import { HttpError, readJson } from '@/lib/request-body';

export const POST = (request: Request) =>
  api(async () => {
    requireSameOrigin(request);
    if (!authConfigured())
      throw new HttpError(
        503,
        'El acceso del equipo todavía no está configurado.'
      );
    const body = (await readJson(request, 4096)) as {
      email?: unknown;
      password?: unknown;
    };
    if (
      !body ||
      typeof body.email !== 'string' ||
      body.email.length > 254 ||
      typeof body.password !== 'string' ||
      body.password.length > 128
    )
      throw new HttpError(400, 'Revisa el correo y la contraseña.');
    const email = body.email.trim().toLowerCase();
    await cmsJson('/auth/attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: createHash('sha256').update(email).digest('hex'),
      }),
    });
    const valid = await verifyPassword(
      body.password,
      process.env.SONLUZ_ADMIN_PASSWORD_HASH!
    );
    if (
      !valid ||
      email !== process.env.SONLUZ_ADMIN_EMAIL?.trim().toLowerCase()
    )
      throw new HttpError(401, 'El correo o la contraseña no son correctos.');
    const session = await editorSession();
    session.email = email;
    session.version = sessionVersion();
    await session.save();
    return json({ signedIn: true });
  });

export const DELETE = (request: Request) =>
  api(async () => {
    await requireEditor(request);
    (await editorSession()).destroy();
    return json({ signedOut: true });
  });
