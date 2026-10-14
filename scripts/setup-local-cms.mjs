import { randomBytes, scryptSync } from 'node:crypto';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const envPath = new URL('.env.local', root);
let text = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
const existing = (name) =>
  text.match(new RegExp(`^${name}=([^\\r\\n]*)`, 'm'))?.[1];
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
const email = process.env.SONLUZ_ADMIN_EMAIL;
const password = process.env.SONLUZ_ADMIN_PASSWORD;
if (email || password) {
  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !password ||
    password.length < 16 ||
    password.length > 128
  )
    throw new Error(
      'Configura un correo válido y una contraseña de 16 a 128 caracteres.'
    );
  const salt = randomBytes(16).toString('hex');
  set('SONLUZ_ADMIN_EMAIL', email.trim().toLowerCase());
  set(
    'SONLUZ_ADMIN_PASSWORD_HASH',
    `${salt}:${scryptSync(password, salt, 32).toString('hex')}`
  );
  set('SONLUZ_SESSION_SECRET', randomBytes(32).toString('hex'));
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
