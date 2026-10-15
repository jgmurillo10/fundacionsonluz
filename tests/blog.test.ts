import { describe, expect, it } from 'vitest';
import {
  emptyDocument,
  postSchema,
  safeImage,
  safeLink,
  slugify,
  validDocument,
  documentText,
  readingTime,
  type PostInput,
} from '../lib/blog';

const input: PostInput = {
  title: 'Una historia',
  slug: 'una-historia',
  excerpt: '',
  content: emptyDocument,
  coverImage: '',
  coverAlt: '',
  category: 'Noticias',
  status: 'draft',
};
const document = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Compartimos una historia de la fundación.' },
      ],
    },
  ],
};
describe('Direcciones de las entradas', () => {
  it('normaliza tildes, espacios y signos', () => {
    expect(slugify('¡Niños del Mañana! Un encuentro único')).toBe(
      'ninos-del-manana-un-encuentro-unico'
    );
  });
  it('limita longitud y elimina guiones finales', () => {
    const slug = slugify('algo '.repeat(50));
    expect(slug.length).toBeLessThanOrEqual(100);
    expect(slug.endsWith('-')).toBe(false);
  });
  it('rechaza rutas, mayúsculas y direcciones vacías', () => {
    for (const slug of ['', 'Hola', '../admin', 'doble--guion'])
      expect(postSchema.safeParse({ ...input, slug }).success).toBe(false);
  });
});
describe('Contenido editorial', () => {
  it('permite guardar borradores vacíos pero no publicarlos', () => {
    expect(postSchema.safeParse(input).success).toBe(true);
    expect(
      postSchema.safeParse({ ...input, status: 'published' }).success
    ).toBe(false);
  });
  it('permite publicar contenido con texto', () => {
    expect(
      postSchema.safeParse({ ...input, content: document, status: 'published' })
        .success
    ).toBe(true);
    expect(readingTime(document)).toBe(1);
    expect(documentText(document)).toContain('fundación');
  });
  it('requiere texto alternativo en portada e imágenes', () => {
    expect(
      postSchema.safeParse({ ...input, coverImage: '/images/foto1.jpg' })
        .success
    ).toBe(false);
    expect(
      validDocument({
        type: 'image',
        attrs: { src: '/images/foto1.jpg', alt: '' },
      })
    ).toBe(false);
    expect(
      validDocument({
        type: 'image',
        attrs: { src: '/images/foto1.jpg', alt: 'Participantes' },
      })
    ).toBe(true);
  });
  it('rechaza scripts, HTML y enlaces peligrosos', () => {
    for (const href of [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'file:///etc/passwd',
      '/admin',
    ])
      expect(safeLink(href)).toBeUndefined();
    expect(safeLink('https://fundacionsonluz.com')).toBe(
      'https://fundacionsonluz.com/'
    );
    expect(safeLink('mailto:FundacionSonLuz@gmail.com')).toBeTruthy();
    expect(validDocument({ type: 'script', text: 'alert(1)' })).toBe(false);
    expect(
      validDocument({
        type: 'text',
        text: 'test',
        marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
      })
    ).toBe(false);
  });
  it('rechaza contenido malformado sin lanzar excepciones', () => {
    for (const content of [
      null,
      5,
      'texto',
      {},
      { type: 'text', text: 'hola', marks: [null] },
      { type: 'paragraph', content: 'incorrecto' },
    ])
      expect(validDocument(content)).toBe(false);
  });
  it('solo admite títulos dentro de la jerarquía editorial', () => {
    expect(validDocument({ type: 'heading', attrs: { level: 1 } })).toBe(false);
    expect(validDocument({ type: 'heading', attrs: { level: 2 } })).toBe(true);
  });
  it('limita documentos excesivamente anidados', () => {
    let node = emptyDocument;
    for (let i = 0; i < 30; i++) node = { type: 'blockquote', content: [node] };
    expect(validDocument(node)).toBe(false);
  });
  it('limita los tipos y rutas de imagen', () => {
    expect(safeImage('/images/foto1.jpg')).toBeTruthy();
    expect(safeImage('/media/test.webp')).toBeTruthy();
    for (const src of [
      '/images/../secret',
      'data:image/svg+xml;base64,PHN2Zz4=',
      'https://untrusted.example/tracker.jpg',
      'javascript:alert(1)',
    ])
      expect(safeImage(src)).toBeUndefined();
  });
});
