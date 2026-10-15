import { requireEditor } from '@/lib/server/editor-auth';
import { cmsJson } from '@/lib/server/cms';
import { api, json } from '@/lib/server/api';
import { readJson } from '@/lib/request-body';

export const GET = () =>
  api(async () => {
    await requireEditor();
    return json(await cmsJson('/posts'));
  });

export const POST = (request: Request) =>
  api(async () => {
    await requireEditor(request);
    return json(
      await cmsJson('/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(await readJson(request)),
      }),
      201
    );
  });
