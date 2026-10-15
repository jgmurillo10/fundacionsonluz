'use client';
/* eslint-disable @next/next/no-img-element -- Local uploads cannot be served by the Next image optimizer. */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { listLocalPosts, subscribeLocalPosts } from '@/lib/local-posts';
import { postDate, readingTime, type Post } from '@/lib/blog';
import { BlogCard } from './blog-card';
import { RichContent } from './rich-content';
import { Sun } from './sun';

export function BlogEmpty() {
  return (
    <div className="blog-empty">
      <Sun />
      <span className="eyebrow">Un nuevo espacio para encontrarnos</span>
      <h2>
        Pronto, más
        <br />
        <em>historias que nos unen.</em>
      </h2>
      <p>
        Aquí compartiremos noticias, encuentros e historias de la Fundación Son
        Luz.
      </p>
      <Link href="/contact" className="text-link" data-analytics="blog_contact">
        Mantengamos el contacto <ArrowUpRight size={16} />
      </Link>
    </div>
  );
}
export function LocalBlog({ slug }: { slug?: string }) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const update = () => {
      try {
        setPosts(
          listLocalPosts().filter((post) => post.status === 'published')
        );
        setError('');
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'No pudimos leer las entradas.'
        );
      }
    };
    update();
    return subscribeLocalPosts(update);
  }, []);
  if (error)
    return (
      <div className="container blog-content">
        <p role="alert">{error}</p>
      </div>
    );
  if (!posts)
    return (
      <div className="container blog-content">
        <p role="status">Cargando historias…</p>
      </div>
    );
  if (slug) {
    const post = posts.find((post) => post.slug === slug);
    if (!post)
      return (
        <div className="blog-content container">
          <div className="blog-empty">
            <Sun />
            <h2>
              Esta historia todavía
              <br />
              <em>no está publicada.</em>
            </h2>
            <Link href="/blog" className="text-link" data-analytics="blog_back">
              Volver al blog <ArrowLeft size={16} />
            </Link>
          </div>
        </div>
      );
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
            <Link href="/blog" className="text-link" data-analytics="blog_back">
              <ArrowLeft size={16} /> Todas las historias
            </Link>
          </div>
        </article>
      </>
    );
  }
  return (
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
  );
}
