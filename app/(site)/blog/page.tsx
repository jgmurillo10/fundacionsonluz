import type { Metadata } from 'next';
import Link from 'next/link';
import { localPreviewEnabled } from '@/lib/local-preview';
import { PageHeading } from '@/components/page-heading';
import { BlogEmpty, LocalBlog } from '@/components/local-blog';
import { cmsConfigured, publishedPosts } from '@/lib/server/cms';
import { BlogCard } from '@/components/blog-card';
import { localCmsPreview } from '@/lib/server/editor-auth';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Nuestro blog',
  alternates: { canonical: '/blog' },
};
export default async function Blog() {
  const connected = cmsConfigured();
  const preview = !connected && localPreviewEnabled();
  const posts = connected ? await publishedPosts() : [];
  return (
    <>
      {preview && (
        <div className="preview-banner">
          Vista previa local. Solo muestra entradas guardadas en este navegador.
          <Link href="/admin">Ir al editor</Link>
        </div>
      )}
      {localCmsPreview() && (
        <div className="preview-banner">
          Blog de revisión con D1/R2 locales. El sitio existente no ha cambiado.
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
          {posts.length ? (
            <div className="blog-grid">
              {posts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <BlogEmpty />
          )}
        </div>
      )}
    </>
  );
}
