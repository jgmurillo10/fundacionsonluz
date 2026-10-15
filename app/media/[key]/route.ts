import { canEdit } from '@/lib/server/editor-auth';
import { cmsFetch } from '@/lib/server/cms';
import { api } from '@/lib/server/api';

export const GET = (
  _request: Request,
  context: { params: Promise<{ key: string }> }
) =>
  api(async () => {
    const { key } = await context.params;
    const response = await cmsFetch(`/media/${encodeURIComponent(key)}`, {
      headers: (await canEdit()) ? { 'x-sonluz-editor': '1' } : {},
    });
    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type':
          response.headers.get('content-type') || 'application/octet-stream',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  });
