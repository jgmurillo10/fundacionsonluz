import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { localPreviewEnabled } from '@/lib/local-preview';
import { LocalBlog } from '@/components/local-blog';
import { cmsConfigured, publishedPost } from '@/lib/server/cms';
import { BlogArticle } from '@/components/blog-article';
export const dynamic = 'force-dynamic';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await publishedPost(slug);
  return post
    ? {
        title: post.title,
        description: post.excerpt,
        alternates: { canonical: `/blog/${post.slug}` },
      }
    : { title: 'Historia de Son Luz', robots: { index: false, follow: false } };
}
export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (cmsConfigured()) {
    const post = await publishedPost(slug);
    if (!post) notFound();
    return <BlogArticle post={post} />;
  }
  if (!localPreviewEnabled()) notFound();
  return (
    <>
      <div className="preview-banner">
        Vista previa local. Esta entrada no está publicada en Internet.
        <Link href="/admin">Volver al editor</Link>
      </div>
      <LocalBlog slug={slug} />
    </>
  );
}
