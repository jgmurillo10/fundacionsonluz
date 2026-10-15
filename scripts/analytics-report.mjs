import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export function reportQuery(days = 30) {
  if (!Number.isInteger(days) || days < 1 || days > 90)
    throw new Error('El periodo debe ser de 1 a 90 días.');
  return `SELECT blob3 AS type, blob4 AS path, blob5 AS action,
    SUM(_sample_interval * double1) AS events
    FROM sonluz_public
    WHERE timestamp >= NOW() - INTERVAL '${days}' DAY AND blob1 = 'v1'
    GROUP BY type, path, action ORDER BY events DESC LIMIT 500 FORMAT JSON`;
}

export async function analyticsReport(
  { accountId, token, days = 30 },
  fetcher = fetch
) {
  if (!/^[a-f0-9]{32}$/.test(accountId || '') || !token)
    throw new Error(
      'Configura CLOUDFLARE_ACCOUNT_ID y CLOUDFLARE_ANALYTICS_READ_TOKEN (Account Analytics: Read).'
    );
  const response = await fetcher(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'text/plain',
      },
      body: reportQuery(days),
      signal: AbortSignal.timeout(15_000),
    }
  );
  if (!response.ok)
    throw new Error(
      `Cloudflare no devolvió el informe (HTTP ${response.status}).`
    );
  const result = await response.json();
  if (!Array.isArray(result.data))
    throw new Error('Respuesta de informe inválida.');
  return result.data;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const data = await analyticsReport({
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      token: process.env.CLOUDFLARE_ANALYTICS_READ_TOKEN,
      days: Number(process.argv[2] || 30),
    });
    console.log(JSON.stringify(data, null, 2));
  } catch {
    console.error(
      'No se pudo consultar la analítica. Comprueba el periodo (1–90 días), el dataset y un token privado Account Analytics: Read.'
    );
    process.exitCode = 1;
  }
}
