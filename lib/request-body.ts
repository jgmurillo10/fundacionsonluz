export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export async function readBody(
  request: Request,
  limit: number
): Promise<Uint8Array> {
  if (Number(request.headers.get('content-length')) > limit)
    throw new HttpError(413, 'El archivo o la entrada es demasiado grande.');
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new HttpError(
          413,
          'El archivo o la entrada es demasiado grande.'
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

export async function readJson(
  request: Request,
  limit = 250_000
): Promise<unknown> {
  try {
    return JSON.parse(new TextDecoder().decode(await readBody(request, limit)));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'JSON inválido.');
  }
}
