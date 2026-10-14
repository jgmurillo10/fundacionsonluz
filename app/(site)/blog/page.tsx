import type { Metadata } from 'next';
import Link from 'next/link';
import { localPreviewEnabled } from '@/lib/local-preview';
import { PageHeading } from '@/components/page-heading';
import { BlogEmpty, LocalBlog } from '@/components/local-blog';
export const metadata: Metadata = {
  title: 'Nuestro blog',
  alternates: { canonical: '/blog' },
};
export default function Blog() {
  const preview = localPreviewEnabled();
  return (
    <>
      {preview && (
        <div className="preview-banner">
          Vista previa local. Solo muestra entradas guardadas en este navegador.
          <Link href="/admin">Ir al editor</Link>
        </div>
      )}
      <PageHeading
        eyebrow="Historias de Son Luz"
        title={
          <>
            Un espacio para
            <br />
            <em>compartir nuestra luz.</em>
          </>
        }
        subtitle="Noticias, encuentros e historias de nuestra fundación."
      />
      {preview ? (
        <LocalBlog />
      ) : (
        <div className="blog-content container">
          <BlogEmpty />
        </div>
      )}
    </>
  );
}
