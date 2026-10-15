import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { randomBytes, scryptSync } from 'node:crypto';
vi.mock('server-only', () => ({}));
const state = vi.hoisted(() => ({
  jar: new Map<string, string>(),
  set: vi.fn(),
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (key: string) =>
      state.jar.has(key) ? { value: state.jar.get(key) } : undefined,
    set: (key: string, value: string, options: unknown) => {
      state.jar.set(key, value);
      state.set(options);
    },
  }),
}));
import {
  authConfigured,
  canEdit,
  editorSession,
  localCmsPreview,
  requireSameOrigin,
  sessionVersion,
  verifyAdminCredentials,
  verifyPassword,
} from '../lib/server/editor-auth';
import { cmsConfigured } from '../lib/server/cms';
import { HttpError, readBody, readJson } from '../lib/request-body';

describe('editor authentication and request boundary', () => {
  let password: string;
  let hash: string;
  beforeEach(() => {
    state.jar.clear();
    state.set.mockClear();
    password = randomBytes(24).toString('hex');
    const salt = randomBytes(16).toString('hex');
    hash = `${salt}:${scryptSync(password, salt, 32).toString('hex')}`;
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SONLUZ_CMS_URL', 'http://127.0.0.1:8787');
    vi.stubEnv('SONLUZ_WORKER_SECRET', randomBytes(32).toString('hex'));
    vi.stubEnv('SONLUZ_SESSION_SECRET', randomBytes(32).toString('hex'));
    vi.stubEnv('SONLUZ_ADMIN_EMAIL', 'editor@example.test');
    vi.stubEnv('SONLUZ_ADMIN_PASSWORD_HASH', hash);
    vi.stubEnv('SONLUZ_ADDITIONAL_ADMINS', '');
    vi.stubEnv('SONLUZ_LOCAL_PREVIEW', '1');
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });
  it('verifies scrypt hashes without accepting bad passwords or malformed hashes', async () => {
    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
    expect(await verifyPassword(password, 'invalid')).toBe(false);
    expect(await verifyPassword('a'.repeat(129), hash)).toBe(false);
  });
  it('uses secure encrypted cookies and denies unauthenticated, tampered and revoked sessions', async () => {
    expect(await canEdit()).toBe(false);
    const session = await editorSession();
    session.email = 'editor@example.test';
    session.version = sessionVersion({
      email: session.email,
      passwordHash: hash,
    });
    await session.save();
    expect(state.set).toHaveBeenCalledWith(
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
      })
    );
    expect(await canEdit()).toBe(true);
    vi.stubEnv(
      'SONLUZ_ADMIN_PASSWORD_HASH',
      hash.replace(/^./, hash[0] === 'a' ? 'b' : 'a')
    );
    expect(await canEdit()).toBe(false);
    vi.stubEnv('SONLUZ_ADMIN_PASSWORD_HASH', hash);
    const parts = state.jar.get('sonluz-editor')!.split('*');
    parts[2] = (parts[2].startsWith('a') ? 'b' : 'a') + parts[2].slice(1);
    state.jar.set('sonluz-editor', parts.join('*'));
    expect(await canEdit()).toBe(false);
  });
  it('expires sessions and destroys the session on logout', async () => {
    const session = await editorSession();
    session.email = 'editor@example.test';
    session.version = sessionVersion({
      email: session.email,
      passwordHash: hash,
    });
    await session.save();
    const saved = state.jar.get('sonluz-editor')!;
    (await editorSession()).destroy();
    expect(await canEdit()).toBe(false);
    state.jar.set('sonluz-editor', saved);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 13 * 60 * 60 * 1000);
    expect(await canEdit()).toBe(false);
  });
  it('allows separate admin credentials without accepting unknown emails or shared passwords', async () => {
    const salt = randomBytes(16).toString('hex');
    const secondPassword = randomBytes(24).toString('hex');
    const second = {
      email: 'second@example.test',
      passwordHash: `${salt}:${scryptSync(secondPassword, salt, 32).toString('hex')}`,
    };
    vi.stubEnv('SONLUZ_ADDITIONAL_ADMINS', JSON.stringify([second]));
    expect(authConfigured()).toBe(true);
    expect(
      await verifyAdminCredentials(' EDITOR@EXAMPLE.TEST ', password)
    ).toEqual({ email: 'editor@example.test', passwordHash: hash });
    expect(
      await verifyAdminCredentials(' SECOND@EXAMPLE.TEST ', secondPassword)
    ).toEqual(second);
    expect(await verifyAdminCredentials(second.email, password)).toBeNull();
    expect(
      await verifyAdminCredentials('editor@example.test', secondPassword)
    ).toBeNull();
    expect(
      await verifyAdminCredentials('outsider@example.test', password)
    ).toBeNull();
    expect(await verifyAdminCredentials(second.email, 'wrong')).toBeNull();
  });
  it('revokes only the changed or removed admin and binds sessions to their email', async () => {
    const second = { email: 'second@example.test', passwordHash: hash };
    vi.stubEnv('SONLUZ_ADDITIONAL_ADMINS', JSON.stringify([second]));
    const primary = await editorSession();
    primary.email = 'editor@example.test';
    primary.version = sessionVersion({
      email: primary.email,
      passwordHash: hash,
    });
    await primary.save();
    const primaryCookie = state.jar.get('sonluz-editor')!;
    const secondary = await editorSession();
    secondary.email = second.email;
    secondary.version = sessionVersion(second);
    await secondary.save();
    const secondCookie = state.jar.get('sonluz-editor')!;
    expect(await canEdit()).toBe(true);
    vi.stubEnv(
      'SONLUZ_ADMIN_PASSWORD_HASH',
      hash.replace(/^./, hash[0] === 'a' ? 'b' : 'a')
    );
    expect(await canEdit()).toBe(true);
    state.jar.set('sonluz-editor', primaryCookie);
    expect(await canEdit()).toBe(false);
    vi.stubEnv('SONLUZ_ADMIN_PASSWORD_HASH', hash);
    expect(await canEdit()).toBe(true);
    vi.stubEnv(
      'SONLUZ_ADDITIONAL_ADMINS',
      JSON.stringify([
        {
          ...second,
          passwordHash: hash.replace(/^./, hash[0] === 'a' ? 'b' : 'a'),
        },
      ])
    );
    expect(await canEdit()).toBe(true);
    state.jar.set('sonluz-editor', secondCookie);
    expect(await canEdit()).toBe(false);
    vi.stubEnv('SONLUZ_ADDITIONAL_ADMINS', JSON.stringify([second]));
    expect(await canEdit()).toBe(true);
    const mismatched = await editorSession();
    mismatched.email = primary.email;
    await mismatched.save();
    expect(await canEdit()).toBe(false);
    state.jar.set('sonluz-editor', secondCookie);
    vi.stubEnv('SONLUZ_ADDITIONAL_ADMINS', '[]');
    expect(await canEdit()).toBe(false);
    state.jar.set('sonluz-editor', primaryCookie);
    expect(await canEdit()).toBe(true);
  });
  it.each([
    'invalid JSON',
    '{}',
    'null',
    '[null]',
    JSON.stringify([{ email: 'second@example.test' }]),
    JSON.stringify([
      { email: 'invalid', passwordHash: 'a'.repeat(32) + ':' + 'b'.repeat(64) },
    ]),
    JSON.stringify([{ email: 'second@example.test', passwordHash: 'invalid' }]),
    JSON.stringify([
      {
        email: ' EDITOR@EXAMPLE.TEST ',
        passwordHash: 'a'.repeat(32) + ':' + 'b'.repeat(64),
      },
    ]),
    JSON.stringify([
      {
        email: 'second@example.test',
        passwordHash: 'a'.repeat(32) + ':' + 'b'.repeat(64),
      },
      {
        email: ' SECOND@EXAMPLE.TEST ',
        passwordHash: 'a'.repeat(32) + ':' + 'b'.repeat(64),
      },
    ]),
  ])(
    'fails closed on invalid or duplicate additional admins (%s)',
    async (value) => {
      vi.stubEnv('SONLUZ_ADDITIONAL_ADMINS', value);
      expect(authConfigured()).toBe(false);
      expect(await canEdit()).toBe(false);
      expect(
        await verifyAdminCredentials('editor@example.test', password)
      ).toBeNull();
      await expect(editorSession()).rejects.toMatchObject({ status: 503 });
    }
  );
  it('requires a valid primary administrator even when another admin is configured', () => {
    vi.stubEnv(
      'SONLUZ_ADDITIONAL_ADMINS',
      JSON.stringify([{ email: 'second@example.test', passwordHash: hash }])
    );
    vi.stubEnv('SONLUZ_ADMIN_EMAIL', 'invalid');
    expect(authConfigured()).toBe(false);
  });
  it('cannot activate the local bypass in production or against a remote Worker', async () => {
    expect(localCmsPreview()).toBe(false);
    vi.stubEnv('NODE_ENV', 'development');
    expect(localCmsPreview()).toBe(true);
    vi.stubEnv('SONLUZ_CMS_URL', 'https://worker.example.test');
    expect(localCmsPreview()).toBe(false);
    expect(await canEdit()).toBe(false);
    vi.stubEnv('SONLUZ_CMS_URL', 'http://worker.example.test');
    expect(cmsConfigured()).toBe(false);
    vi.stubEnv('SONLUZ_SESSION_SECRET', 'short');
    expect(authConfigured()).toBe(false);
  });
  it('rejects cross-origin mutations and requests without an Origin', () => {
    const request = (origin?: string) =>
      new Request('https://site.test/api/editor/posts', {
        method: 'POST',
        headers: origin
          ? { Origin: origin, Host: 'site.test' }
          : { Host: 'site.test' },
      });
    expect(() => requireSameOrigin(request('https://site.test'))).not.toThrow();
    expect(() => requireSameOrigin(request('https://evil.test'))).toThrow(
      HttpError
    );
    expect(() => requireSameOrigin(request())).toThrow(HttpError);
    expect(() =>
      requireSameOrigin(
        new Request('https://internal.test/api/editor/posts', {
          method: 'POST',
          headers: {
            Origin: 'https://site.test',
            Host: 'site.test',
            'x-forwarded-proto': 'https',
          },
        })
      )
    ).not.toThrow();
  });
  it('bounds streamed request bodies even without Content-Length and rejects malformed JSON', async () => {
    await expect(
      readBody(
        new Request('https://site.test', {
          method: 'POST',
          body: 'a'.repeat(100),
        }),
        10
      )
    ).rejects.toMatchObject({ status: 413 });
    await expect(
      readJson(
        new Request('https://site.test', { method: 'POST', body: 'invalid' })
      )
    ).rejects.toMatchObject({ status: 400 });
  });
});
