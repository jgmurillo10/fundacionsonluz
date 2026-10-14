import { Sun } from './sun';
export function PageHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle: string;
}) {
  return (
    <section className="page-heading">
      <div className="container">
        <span className="eyebrow" data-hero-reveal>
          {eyebrow}
        </span>
        <h1 data-hero-reveal>{title}</h1>
        <p data-hero-reveal>{subtitle}</p>
      </div>
      <Sun className="page-sun" />
    </section>
  );
}
