import type { MetadataRoute } from 'next';
import { publishedPosts } from '@/lib/server/cms';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL || 'https://fundacionsonluz.com';
  const pages: MetadataRoute.Sitemap = [
    '',
    '/about',
    '/donate',
    '/contact',
    '/blog',
  ].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: 'monthly',
    priority: path ? 0.7 : 1,
  }));
  return [
    ...pages,
    ...(await publishedPosts()).map((post) => ({
      url: `${base}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
