import { z } from 'zod';

export type RichMark = { type: string; attrs?: Record<string, unknown> };
export type RichNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: RichMark[];
  content?: RichNode[];
};
export type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: RichNode;
  coverImage: string;
  coverAlt: string;
  category: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};
export type PostInput = Pick<
  Post,
  | 'title'
  | 'slug'
  | 'excerpt'
  | 'content'
  | 'coverImage'
  | 'coverAlt'
  | 'category'
  | 'status'
>;
export const categories = [
  'Noticias',
  'Encuentros',
  'Historias',
  'Nuestra fundación',
] as const;
export const emptyDocument: RichNode = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};
export function slugify(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100)
    .replace(/-$/g, '');
}
export function safeLink(value: unknown): string | undefined {
  if (typeof value !== 'string') return;
  try {
    const url = new URL(value);
    if (['https:', 'http:', 'mailto:'].includes(url.protocol)) return url.href;
  } catch {
    return;
  }
}
export function safeImage(value: unknown): string | undefined {
  if (typeof value !== 'string') return;
  if (/^\/images\/[a-zA-Z0-9._-]+$/.test(value)) return value;
  if (/^\/media\/[a-zA-Z0-9._-]+$/.test(value)) return value;
  if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value))
    return value;
}
export function documentText(node: RichNode): string {
  if (node.type === 'text') return node.text || '';
  return (node.content || [])
    .map(documentText)
    .join(node.type === 'paragraph' || node.type === 'heading' ? '' : ' ');
}
const nodeTypes = new Set([
  'doc',
  'text',
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'blockquote',
  'hardBreak',
  'horizontalRule',
  'image',
  'codeBlock',
]);
const markTypes = new Set([
  'bold',
  'italic',
  'strike',
  'underline',
  'code',
  'link',
]);
export function validDocument(value: unknown, depth = 0): value is RichNode {
  if (depth > 25 || !value || typeof value !== 'object') return false;
  const node = value as RichNode;
  if (!nodeTypes.has(node.type)) return false;
  if (node.type === 'text' && typeof node.text !== 'string') return false;
  if (node.type === 'heading' && ![2, 3].includes(Number(node.attrs?.level)))
    return false;
  if (
    node.type === 'image' &&
    (!safeImage(node.attrs?.src) ||
      typeof node.attrs?.alt !== 'string' ||
      !node.attrs.alt.trim())
  )
    return false;
  if (
    node.marks &&
    (!Array.isArray(node.marks) ||
      !node.marks.every(
        (mark) =>
          mark &&
          typeof mark === 'object' &&
          markTypes.has(mark.type) &&
          (mark.type !== 'link' || !!safeLink(mark.attrs?.href))
      ))
  )
    return false;
  return (
    !node.content ||
    (Array.isArray(node.content) &&
      node.content.length <= 1000 &&
      node.content.every((child) => validDocument(child, depth + 1)))
  );
}
export const postSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Escribe un título.')
      .max(180, 'El título no puede superar 180 caracteres.'),
    slug: z
      .string()
      .min(1, 'Escribe una dirección para la entrada.')
      .max(100)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'Usa letras minúsculas sin tildes, números y guiones en la dirección.'
      ),
    excerpt: z
      .string()
      .trim()
      .max(350, 'El resumen no puede superar 350 caracteres.'),
    category: z.enum(categories),
    content: z.custom<RichNode>(
      (value) => validDocument(value) && (value as RichNode).type === 'doc',
      'El contenido contiene un formato o enlace no admitido.'
    ),
    coverImage: z
      .string()
      .refine(
        (value) => !value || !!safeImage(value),
        'La imagen de portada no es válida.'
      ),
    coverAlt: z.string().trim().max(250),
    status: z.enum(['draft', 'published']),
  })
  .superRefine((post, context) => {
    if (post.coverImage && !post.coverAlt)
      context.addIssue({
        code: 'custom',
        path: ['coverAlt'],
        message:
          'Describe la imagen de portada para las personas que usan lectores de pantalla.',
      });
    if (post.status === 'published' && !documentText(post.content).trim())
      context.addIssue({
        code: 'custom',
        path: ['content'],
        message: 'Añade texto antes de publicar.',
      });
    if (JSON.stringify(post).length > 4_000_000)
      context.addIssue({
        code: 'custom',
        message:
          'La entrada es demasiado grande. Usa menos imágenes o imágenes más pequeñas.',
      });
  });
export const storedPostSchema = z.intersection(
  postSchema,
  z.object({
    id: z.string().uuid(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    publishedAt: z.iso.datetime().nullable(),
  })
);
export function postDate(date: string) {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Bogota',
  }).format(new Date(date));
}
export function readingTime(content: RichNode) {
  return Math.max(
    1,
    Math.ceil(documentText(content).split(/\s+/).filter(Boolean).length / 200)
  );
}
