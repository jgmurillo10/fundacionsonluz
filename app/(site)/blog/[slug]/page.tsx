import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { localPreviewEnabled } from '@/lib/local-preview';
import { LocalBlog } from '@/components/local-blog';
export const metadata: Metadata = {
  title: 'Historia de Son Luz',
  robots: { index: false, follow: false },
};
export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!localPreviewEnabled()) notFound();
  const { slug } = await params;
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
