import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Heart, Landmark } from 'lucide-react';
import { foundation } from '@/lib/content';
import { PageHeading } from '@/components/page-heading';
import { CopyAccount } from '@/components/copy-account';
export const metadata: Metadata = {
  title: 'Haz tu donación',
  alternates: { canonical: '/donate' },
};
export default function Donate() {
  return (
    <>
      <PageHeading
        eyebrow="Cada aporte importa"
        title={
          <>
            Dona tu
            <br />
            <em>granito de arena.</em>
          </>
        }
        subtitle="Aquí encuentras nuestros datos para que puedas donar."
      />
      <section className="donate-content container">
        <div className="bank-card" data-reveal>
          <Landmark size={28} strokeWidth={1.3} />
          <span className="eyebrow">Cuentas de ahorro</span>
          <h2>{foundation.bank}</h2>
          <p>
            Estos son los datos de nuestra cuenta de ahorros{' '}
            <strong>Bancolombia</strong>.
          </p>
          <div className="bank-number">
            <span>Ahorros, Bancolombia</span>
            <strong>#{foundation.account}</strong>
          </div>
          <CopyAccount />
        </div>
        <div className="other-donation" data-reveal>
          <Heart size={38} strokeWidth={1.2} />
          <h2>
            Hay muchas
            <br />
            formas de <em>apoyar.</em>
          </h2>
          <h3>¿Quieres donar tu tiempo, alimentos o algo distinto a dinero?</h3>
          <p>
            Si quieres donar algo distinto a dinero o aun no estás seguro de en
            qué se va a utilizar tu donación, contáctanos!
          </p>
          <Link
            href="/contact"
            className="button button-green"
            data-analytics="donate_contact"
          >
            Contáctanos <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}
