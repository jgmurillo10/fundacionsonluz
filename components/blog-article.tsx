/* eslint-disable @next/next/no-img-element -- Private media is streamed by the same-origin route with no-store access checks. */
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { postDate, readingTime, type Post } from '@/lib/blog';
import { RichContent } from './rich-content';
export function BlogArticle({ post }: { post: Post }) {
  return (
    <>
      <header className="article-header">
        <span className="eyebrow">
          {post.category} · {postDate(post.publishedAt || post.createdAt)} ·{' '}
          {readingTime(post.content)} min de lectura
        </span>
        <h1>{post.title}</h1>
        <p>{post.excerpt}</p>
      </header>
      {post.coverImage && (
        <div className="article-cover">
          <img src={post.coverImage} alt={post.coverAlt} />
        </div>
      )}
      <article className="article-body">
        <RichContent document={post.content} />
        <div className="article-back">
          <Link href="/blog" className="text-link">
            <ArrowLeft size={16} /> Todas las historias
          </Link>
        </div>
      </article>
    </>
  );
}
