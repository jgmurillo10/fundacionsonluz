import { requireEditor } from '@/lib/server/editor-auth';
import { cmsJson } from '@/lib/server/cms';
import { api, json } from '@/lib/server/api';
import { readJson } from '@/lib/request-body';

type Context = { params: Promise<{ id: string }> };
async function handle(request: Request, context: Context) {
  return api(async () => {
    await requireEditor(request);
    const { id } = await context.params;
    const init: RequestInit = { method: request.method };
    if (request.method !== 'GET') {
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(await readJson(request));
    }
    return json(await cmsJson(`/posts/${encodeURIComponent(id)}`, init));
  });
}
export const GET = handle;
export const PUT = handle;
export const DELETE = handle;
