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
    session.version = sessionVersion();
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
    session.version = sessionVersion();
    await session.save();
    const saved = state.jar.get('sonluz-editor')!;
    (await editorSession()).destroy();
    expect(await canEdit()).toBe(false);
    state.jar.set('sonluz-editor', saved);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 13 * 60 * 60 * 1000);
    expect(await canEdit()).toBe(false);
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
