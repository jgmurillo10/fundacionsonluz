/* eslint-disable @next/next/no-img-element -- Cover images are user-created local preview data URLs. */
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { postDate, readingTime, safeImage, type Post } from '@/lib/blog';
import { Sun } from './sun';
export function BlogCard({ post }: { post: Post }) {
  return (
    <article className="blog-card">
      <Link href={`/blog/${post.slug}`} data-analytics="blog_read">
        <div className="blog-card-photo">
          {safeImage(post.coverImage) ? (
            <img src={post.coverImage} alt={post.coverAlt} loading="lazy" />
          ) : (
            <Sun className="blog-card-sun" />
          )}
        </div>
        <span className="eyebrow">
          {post.category} · {postDate(post.publishedAt || post.createdAt)}
        </span>
        <h2>{post.title}</h2>
        <p>{post.excerpt}</p>
        <span className="text-link">
          Leer historia <ArrowUpRight size={16} />
        </span>
        <small className="reading-time">
          {readingTime(post.content)} min de lectura
        </small>
      </Link>
    </article>
  );
}
