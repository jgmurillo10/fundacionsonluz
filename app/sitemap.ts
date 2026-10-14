import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL || 'https://fundacionsonluz.com';
  return ['', '/about', '/donate', '/contact', '/blog'].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: 'monthly',
    priority: path ? 0.7 : 1,
  }));
}
