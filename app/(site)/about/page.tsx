import type { Metadata } from 'next';
import Image from 'next/image';
import { foundation } from '@/lib/content';
import { PageHeading } from '@/components/page-heading';
import { JoinSection } from '@/components/join-section';
export const metadata: Metadata = {
  title: 'Acerca de nosotros',
  alternates: { canonical: '/about' },
};
export default function About() {
  return (
    <>
      <PageHeading
        eyebrow="Nuestra fundación"
        title={
          <>
            Acerca de
            <br />
            <em>nosotros.</em>
          </>
        }
        subtitle="Fundación Son Luz Niños del Mañana"
      />
      <div className="about-content container">
        <div className="about-photo" data-reveal>
          <Image
            src="/images/foto1.jpg"
            alt="La comunidad de Fundación Son Luz reunida"
            fill
            sizes="(max-width: 800px) 100vw, 45vw"
          />
        </div>
        <div className="about-intro" data-reveal>
          <span className="eyebrow">01 / Quiénes somos</span>
          <h2>¿Quiénes somos?</h2>
          <p>{foundation.about}</p>
        </div>
        <section className="mission-section" data-reveal>
          <span className="eyebrow">02 / Misión</span>
          <h2>
            Felicidad y<br />
            <em>esperanza.</em>
          </h2>
          <div>
            <p>{foundation.mission}</p>
            <p>{foundation.missionClosing}</p>
          </div>
        </section>
        <section className="vision-section" data-reveal>
          <span className="eyebrow">03 / Visión</span>
          <h2>
            Una mejor
            <br />
            <em>calidad de vida.</em>
          </h2>
          <p>{foundation.vision}</p>
        </section>
      </div>
      <JoinSection />
    </>
  );
}
