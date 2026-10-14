import 'server-only';
import { HttpError } from '../request-body';

export async function api(operation: () => Promise<Response>) {
  try {
    return await operation();
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof HttpError
            ? error.message
            : 'El servicio no está disponible. Intenta de nuevo.',
      },
      {
        status: error instanceof HttpError ? error.status : 503,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  }
}

export function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}
