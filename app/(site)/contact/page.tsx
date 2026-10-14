import type { Metadata } from 'next';
import { ArrowUpRight, Mail } from 'lucide-react';
import { foundation } from '@/lib/content';
import { PageHeading } from '@/components/page-heading';
import { ContactForm } from '@/components/contact-form';
export const metadata: Metadata = {
  title: 'Contáctanos',
  alternates: { canonical: '/contact' },
};
export default function Contact() {
  return (
    <>
      <PageHeading
        eyebrow="Hablemos"
        title={
          <>
            Estamos aquí
            <br />
            <em>para escucharte.</em>
          </>
        }
        subtitle="Contáctanos. Estamos atentos a resolver tus dudas."
      />
      <section className="contact-content container">
        <aside data-reveal>
          <Mail size={35} strokeWidth={1.2} />
          <h2>
            Una conversación
            <br />
            puede ser el <em>inicio.</em>
          </h2>
          <p>{foundation.invitation}</p>
          <a
            href={`mailto:${foundation.email}`}
            className="text-link contact-email"
          >
            {foundation.email} <ArrowUpRight size={17} />
          </a>
        </aside>
        <div data-reveal>
          <ContactForm />
        </div>
      </section>
    </>
  );
}
