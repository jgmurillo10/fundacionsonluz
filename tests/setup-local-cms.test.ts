import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { randomBytes, scryptSync } from 'node:crypto';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('local admin provisioning', () => {
  let root: string;
  let password: string;
  const values = () =>
    Object.fromEntries(
      readFileSync(join(root, '.env.local'), 'utf8')
        .trim()
        .split('\n')
        .map((line) => {
          const index = line.indexOf('=');
          return [
            line.slice(0, index),
            line.slice(index + 1).replace(/^(['"])(.*)\1$/, '$2'),
          ];
        })
    );
  const run = (env: Record<string, string> = {}) =>
    execFileSync(
      process.execPath,
      [join(root, 'scripts/setup-local-cms.mjs')],
      {
        env: {
          ...process.env,
          SONLUZ_ADMIN_EMAIL: '',
          SONLUZ_ADMIN_PASSWORD: '',
          SONLUZ_ADDITIONAL_ADMIN_EMAIL: '',
          SONLUZ_ADDITIONAL_ADMIN_PASSWORD: '',
          ...env,
        },
        stdio: 'pipe',
      }
    );
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'sonluz-admin-'));
    mkdirSync(join(root, 'scripts'));
    symlinkSync(
      new URL('../node_modules', import.meta.url),
      join(root, 'node_modules'),
      'dir'
    );
    copyFileSync(
      new URL('../scripts/setup-local-cms.mjs', import.meta.url),
      join(root, 'scripts/setup-local-cms.mjs')
    );
    password = randomBytes(24).toString('hex');
    run({ SONLUZ_ADMIN_PASSWORD: password });
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));
  it('defaults to Juan’s email, stores only hashes and restricts local file permissions', () => {
    const configured = values();
    expect(configured.SONLUZ_ADMIN_EMAIL).toBe('juanchomurcas@gmail.com');
    const [salt, hash] = configured.SONLUZ_ADMIN_PASSWORD_HASH.split(':');
    expect(scryptSync(password, salt, 32).toString('hex')).toBe(hash);
    expect(readFileSync(join(root, '.env.local'), 'utf8')).not.toContain(
      password
    );
    expect(statSync(join(root, '.env.local')).mode & 0o777).toBe(0o600);
    expect(statSync(join(root, '.dev.vars')).mode & 0o777).toBe(0o600);
  });
  it('adds and updates another admin without rotating primary credentials or shared secrets', () => {
    const before = values();
    const additionalPassword = randomBytes(24).toString('hex');
    const input = {
      SONLUZ_ADDITIONAL_ADMIN_EMAIL: ' SECOND@EXAMPLE.TEST ',
      SONLUZ_ADDITIONAL_ADMIN_PASSWORD: additionalPassword,
    };
    run(input);
    const after = values();
    expect(after.SONLUZ_ADMIN_PASSWORD_HASH).toBe(
      before.SONLUZ_ADMIN_PASSWORD_HASH
    );
    expect(after.SONLUZ_SESSION_SECRET).toBe(before.SONLUZ_SESSION_SECRET);
    expect(after.SONLUZ_WORKER_SECRET).toBe(before.SONLUZ_WORKER_SECRET);
    const [second] = JSON.parse(after.SONLUZ_ADDITIONAL_ADMINS);
    expect(second.email).toBe('second@example.test');
    const [salt, hash] = second.passwordHash.split(':');
    expect(scryptSync(additionalPassword, salt, 32).toString('hex')).toBe(hash);
    run(input);
    const updated = JSON.parse(values().SONLUZ_ADDITIONAL_ADMINS);
    expect(updated).toHaveLength(1);
    expect(updated[0].passwordHash).not.toBe(second.passwordHash);
    run({ SONLUZ_ADMIN_PASSWORD: randomBytes(24).toString('hex') });
    expect(values().SONLUZ_SESSION_SECRET).toBe(before.SONLUZ_SESSION_SECRET);
    expect(JSON.parse(values().SONLUZ_ADDITIONAL_ADMINS)).toEqual(updated);
  });
  it('serializes special email characters safely in dotenv JSON', () => {
    const email = "o'neill@example.test";
    run({
      SONLUZ_ADDITIONAL_ADMIN_EMAIL: email,
      SONLUZ_ADDITIONAL_ADMIN_PASSWORD: password,
    });
    expect(JSON.parse(values().SONLUZ_ADDITIONAL_ADMINS)[0].email).toBe(email);
    expect(values().SONLUZ_ADDITIONAL_ADMINS).not.toContain('$');
    expect(values().SONLUZ_ADDITIONAL_ADMINS).not.toContain("'");
  });
  it.each([
    { SONLUZ_ADDITIONAL_ADMIN_EMAIL: 'JUANCHOMURCAS@gmail.com' },
    {
      SONLUZ_ADDITIONAL_ADMIN_EMAIL: 'second@example.test',
      SONLUZ_ADDITIONAL_ADMIN_PASSWORD: 'short',
    },
    { SONLUZ_ADDITIONAL_ADMIN_EMAIL: 'invalid' },
    { SONLUZ_ADDITIONAL_ADMIN_EMAIL: '' },
  ])(
    'rejects invalid additional credentials without changing files (%j)',
    (env) => {
      const before = readFileSync(join(root, '.env.local'), 'utf8');
      expect(() =>
        run({ SONLUZ_ADDITIONAL_ADMIN_PASSWORD: password, ...env })
      ).toThrow();
      expect(readFileSync(join(root, '.env.local'), 'utf8')).toBe(before);
    }
  );
  it('refuses to overwrite remote CMS configuration', () => {
    const path = join(root, '.env.local');
    const before = readFileSync(path, 'utf8').replace(
      'http://127.0.0.1:8787',
      'https://worker.example.test'
    );
    writeFileSync(path, before);
    expect(() => run()).toThrow();
    expect(readFileSync(path, 'utf8')).toBe(before);
  });
});
