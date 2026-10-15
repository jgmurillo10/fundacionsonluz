import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { foundation } from '@/lib/content';
import { Sun } from './sun';
export function JoinSection() {
  return (
    <section className="join-section" data-reveal>
      <div>
        <span className="eyebrow">Cada aporte importa</span>
        <h2>
          Súmate a<br />
          nuestro <em>proyecto.</em>
        </h2>
        <p>{foundation.invitation}</p>
        <div className="button-row">
          <Link
            href="/donate"
            className="button button-yellow"
            data-analytics="join_donate"
          >
            Donar <ArrowUpRight size={18} />
          </Link>
          <Link
            href="/contact"
            className="button button-outline-light"
            data-analytics="join_contact"
          >
            Contactar <ArrowUpRight size={18} />
          </Link>
        </div>
      </div>
      <Sun className="join-sun" />
    </section>
  );
}
