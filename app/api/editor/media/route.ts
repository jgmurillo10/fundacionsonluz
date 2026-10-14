import { requireEditor } from '@/lib/server/editor-auth';
import { cmsJson } from '@/lib/server/cms';
import { api, json } from '@/lib/server/api';
import { readBody } from '@/lib/request-body';

export const POST = (request: Request) =>
  api(async () => {
    await requireEditor(request);
    const bytes = await readBody(request, 10 * 1024 * 1024);
    return json(
      await cmsJson('/media', {
        method: 'POST',
        headers: { 'Content-Type': request.headers.get('content-type') || '' },
        body: bytes.buffer as ArrayBuffer,
      }),
      201
    );
  });
