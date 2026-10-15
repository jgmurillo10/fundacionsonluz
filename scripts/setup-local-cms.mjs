import { randomBytes, scryptSync } from 'node:crypto';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const root = new URL('../', import.meta.url);
const envPath = new URL('.env.local', root);
let text = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
const existing = (name) =>
  text
    .match(new RegExp(`^${name}=([^\\r\\n]*)`, 'm'))?.[1]
    ?.replace(/^(['"])(.*)\1$/, '$2');
const url = existing('SONLUZ_CMS_URL');
if (url && !['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname))
  throw new Error(
    'No se reemplaza una configuración de CMS remoto. Usa otro checkout para las pruebas locales.'
  );
function set(name, value) {
  const expression = new RegExp(`^${name}=.*$`, 'm');
  text = expression.test(text)
    ? text.replace(expression, `${name}=${value}`)
    : `${text.trimEnd()}\n${name}=${value}\n`;
}
const secret =
  existing('SONLUZ_WORKER_SECRET') || randomBytes(32).toString('hex');
set('SONLUZ_CMS_URL', 'http://127.0.0.1:8787');
set('SONLUZ_WORKER_SECRET', secret);
function credentials(email, password) {
  const normalized = email?.trim().toLowerCase();
  if (
    !normalized ||
    !z.email().max(254).safeParse(normalized).success ||
    !password ||
    password.length < 16 ||
    password.length > 128
  )
    throw new Error(
      'Configura un correo válido y una contraseña de 16 a 128 caracteres.'
    );
  const salt = randomBytes(16).toString('hex');
  return {
    email: normalized,
    passwordHash: `${salt}:${scryptSync(password, salt, 32).toString('hex')}`,
  };
}
const email =
  process.env.SONLUZ_ADMIN_EMAIL ||
  existing('SONLUZ_ADMIN_EMAIL') ||
  'juanchomurcas@gmail.com';
const password = process.env.SONLUZ_ADMIN_PASSWORD;
if (process.env.SONLUZ_ADMIN_EMAIL || password) {
  const primary = credentials(email, password);
  set('SONLUZ_ADMIN_EMAIL', primary.email);
  set('SONLUZ_ADMIN_PASSWORD_HASH', primary.passwordHash);
  set(
    'SONLUZ_SESSION_SECRET',
    existing('SONLUZ_SESSION_SECRET') || randomBytes(32).toString('hex')
  );
}
const additionalEmail = process.env.SONLUZ_ADDITIONAL_ADMIN_EMAIL;
const additionalPassword = process.env.SONLUZ_ADDITIONAL_ADMIN_PASSWORD;
if (additionalEmail || additionalPassword) {
  const additional = credentials(additionalEmail, additionalPassword);
  if (
    !existing('SONLUZ_ADMIN_PASSWORD_HASH') ||
    additional.email === existing('SONLUZ_ADMIN_EMAIL')?.trim().toLowerCase()
  )
    throw new Error(
      'Configura primero el administrador principal y usa un correo adicional distinto.'
    );
  const admins = JSON.parse(existing('SONLUZ_ADDITIONAL_ADMINS') || '[]');
  if (
    !Array.isArray(admins) ||
    admins.some(
      (admin) =>
        !admin ||
        typeof admin.email !== 'string' ||
        !/^[0-9a-f]{32}:[0-9a-f]{64}$/.test(admin.passwordHash)
    )
  )
    throw new Error('La lista de administradores adicionales no es válida.');
  const updated = [
    ...admins.filter(
      (admin) => admin.email.trim().toLowerCase() !== additional.email
    ),
    additional,
  ];
  const serialized = JSON.stringify(updated)
    .replace(/'/g, '\\u0027')
    .replace(/\$/g, '\\u0024');
  set('SONLUZ_ADDITIONAL_ADMINS', `'${serialized}'`);
}
writeFileSync(envPath, text.trimStart(), { mode: 0o600 });
chmodSync(envPath, 0o600);
const varsPath = new URL('.dev.vars', root);
let vars = existsSync(varsPath) ? readFileSync(varsPath, 'utf8') : '';
const binding = /^SONLUZ_WORKER_SECRET=.*$/m;
vars = binding.test(vars)
  ? vars.replace(binding, `SONLUZ_WORKER_SECRET=${secret}`)
  : `${vars.trimEnd()}\nSONLUZ_WORKER_SECRET=${secret}\n`;
writeFileSync(varsPath, vars.trimStart(), { mode: 0o600 });
chmodSync(varsPath, 0o600);
console.log(
  `CMS local configurado en ${fileURLToPath(root)}. Los secretos están en archivos ignorados por Git; no se han creado recursos remotos.`
);
