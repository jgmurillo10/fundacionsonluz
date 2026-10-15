'use client';
export async function prepareLocalImage(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Elige una imagen JPG, PNG o WebP.');
  if (file.size > 10 * 1024 * 1024)
    throw new Error('La imagen debe pesar menos de 10 MB.');
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('No pudimos abrir esta imagen. Prueba con otro archivo.');
  });
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context)
      throw new Error('Tu navegador no permite preparar esta imagen.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/webp', 0.78);
    if (data.length > 1_000_000)
      throw new Error(
        'La imagen sigue siendo demasiado grande. Usa una imagen más pequeña.'
      );
    return data;
  } finally {
    bitmap.close();
  }
}
