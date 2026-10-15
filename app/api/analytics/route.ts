import { analyticsConfig } from '@/lib/server/analytics';
import { parseAnalyticsEvent, publicAnalyticsPath } from '@/lib/analytics';
import { cmsJson } from '@/lib/server/cms';
import { api } from '@/lib/server/api';
import { requireSameOrigin } from '@/lib/server/editor-auth';
import { HttpError, readJson } from '@/lib/request-body';

export const POST = (request: Request) =>
  api(async () => {
    const config = analyticsConfig();
    if (!config) throw new HttpError(404, 'No encontrado.');
    requireSameOrigin(request);
    if (
      request.headers.get('content-type')?.split(';')[0].trim() !==
      'application/json'
    )
      throw new HttpError(415, 'Tipo de contenido inválido.');
    const origin = new URL(request.headers.get('origin')!);
    if (
      !config.domains.includes(origin.hostname) ||
      origin.protocol !== 'https:' ||
      (request.headers.has('sec-fetch-site') &&
        request.headers.get('sec-fetch-site') !== 'same-origin')
    )
      throw new HttpError(403, 'Dominio no autorizado.');
    if (
      ['1', 'yes'].includes(request.headers.get('dnt') || '') ||
      request.headers.get('sec-gpc') === '1'
    )
      return new Response(null, {
        status: 204,
        headers: { 'Cache-Control': 'no-store' },
      });
    const event = parseAnalyticsEvent(await readJson(request, 1024));
    if (!event) throw new HttpError(400, 'Evento inválido.');
    const referrer = request.headers.get('referer');
    if (
      !referrer ||
      publicAnalyticsPath(referrer, origin.origin) !== event.path
    )
      throw new HttpError(403, 'Ruta de origen no autorizada.');
    await cmsJson('/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...event, hostname: origin.hostname }),
    });
    return new Response(null, {
      status: 204,
      headers: { 'Cache-Control': 'no-store' },
    });
  });
