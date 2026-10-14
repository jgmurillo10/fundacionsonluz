import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowDown, ArrowUpRight, Heart } from 'lucide-react';
import { foundation, pillars } from '@/lib/content';
import { Sun } from '@/components/sun';
import { JoinSection } from '@/components/join-section';
export const metadata: Metadata = { alternates: { canonical: '/' } };
export default function Home() {
  return (
    <>
      <section className="hero container">
        <div className="hero-copy">
          <span className="eyebrow hero-eyebrow" data-hero-reveal>
            <span className="live-dot" /> Fundación Son Luz
          </span>
          <h1 data-hero-reveal>
            Niños del
            <br />
            <em>mañana.</em>
            <span className="heading-star">✳</span>
          </h1>
          <p data-hero-reveal>{foundation.purpose}</p>
          <div className="button-row" data-hero-reveal>
            <Link href="/about" className="button button-green">
              Conoce nuestra fundación <ArrowUpRight size={18} />
            </Link>
            <a
              href="#proposito"
              className="round-link"
              aria-label="Explorar nuestro propósito"
            >
              <ArrowDown size={20} />
            </a>
          </div>
          <div className="hero-note" data-hero-reveal>
            <Heart size={15} strokeWidth={1.5} />
            <span>Desarrollo. Igualdad. Conciencia. Apoyo.</span>
          </div>
        </div>
        <div className="hero-visual" data-hero-reveal>
          <div className="hero-photo">
            <Image
              src="/images/banner.jpg"
              alt="Niños, jóvenes y acompañantes compartiendo una actividad al aire libre junto a la piscina"
              fill
              priority
              sizes="(max-width: 800px) 100vw, 52vw"
            />
            <div className="photo-caption">
              <span>JUNTOS, SOMOS LUZ</span>
              <span>↗</span>
            </div>
          </div>
          <Sun className="hero-sun" />
          <div className="hero-stamp">
            <span>Cada niño,</span>
            <span>un mundo de</span>
            <em>posibilidades.</em>
          </div>
          <span className="hero-photo-label">Momentos que nos unen.</span>
        </div>
      </section>
      <div className="values-strip" aria-label="Nuestros valores">
        <div>
          <span>Desarrollo</span>
          <Sun />
          <span>Igualdad</span>
          <Sun />
          <span>Conciencia</span>
          <Sun />
          <span>Apoyo</span>
          <Sun />
          <span>Son Luz</span>
        </div>
      </div>
      <section id="proposito" className="purpose-section container">
        <div className="purpose-label" data-reveal>
          <span className="eyebrow">01 / Nuestro propósito</span>
          <span className="small-sun">
            <Sun />
          </span>
        </div>
        <div data-reveal>
          <h2>
            El desarrollo de cada niño.
            <br />
            La luz de <em>cada familia.</em>
          </h2>
          <p>{foundation.introduction}</p>
          <Link href="/about" className="text-link">
            Conoce nuestra misión y visión <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      <section className="pillars-section">
        <div className="container">
          <div className="section-heading" data-reveal>
            <span className="eyebrow">02 / Lo que nos mueve</span>
            <h2>
              Un propósito.
              <br />
              <em>Muchas formas de cuidar.</em>
            </h2>
            <p>Desarrollo, igualdad, conciencia y apoyo.</p>
          </div>
          <div className="pillar-list">
            {pillars.map((pillar, i) => (
              <article
                className={`pillar ${i % 2 ? 'pillar-reverse' : ''}`}
                key={pillar.title}
              >
                <div className="pillar-image" data-reveal>
                  <Image
                    src={`/images/${pillar.image}`}
                    alt={pillar.alt}
                    fill
                    sizes="(max-width: 800px) 100vw, 45vw"
                    data-parallax
                  />
                  <span className="image-index">0{i + 1}</span>
                </div>
                <div className="pillar-copy" data-reveal>
                  <span className="eyebrow">{pillar.label}</span>
                  <h3>
                    {pillar.title}
                    <span>.</span>
                  </h3>
                  <p>{pillar.text}</p>
                  <span className="pillar-rule">
                    <Sun />
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="blog-teaser container" data-reveal>
        <div>
          <span className="eyebrow">03 / Historias de Son Luz</span>
          <h2>
            Un espacio para
            <br />
            <em>compartir nuestra luz.</em>
          </h2>
        </div>
        <div>
          <p>Noticias, encuentros e historias de nuestra fundación.</p>
          <Link href="/blog" className="text-link">
            Visita nuestro blog <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      <JoinSection />
    </>
  );
}
