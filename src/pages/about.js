import React from 'react';

import Layout from '../components/Layout';

const IndexPage = () => (
  <Layout fullMenu>
    <article id="main">
      <header>
        <h2>Acerca de nosotros</h2>
        <p>Fundación Son Luz Niños del Mañana</p>
      </header>
      <section className="wrapper style5">
        <div className="inner">
          <h3>¿Quiénes somos?</h3>
          <p>
            La fundación tiene por objeto constituirse, desarrollarse y consolidarse en una
            entidad privada sin ánimo de lucro, de contenido servició social y humanitario
            enfocada a la educación, salud, formación, nutrición y protección integral de los
            niños, niñas o adolescentes con discapacidad en vulneración, proponiendo por
            constituirse en una organización esencialmente humanitaria y benéfica que ofrece
            alternativas no gubernamentales a la falta de opciones y oportunidades que tienen
            los niños, niñas o adolescentes para acceder a una ayuda oportuna y eficaz en los
            aspectos básicos de educación formal y no formal, servicios de salud y orientación
            en los procesos nutricionales.
          </p>
          <hr />
          <h3>Misión</h3>
          <p>
            La fundación son luz: es una organización privada sin ánimo de lucro cuyo objetivo
            es facilitar la participación e interacción de los diferentes agentes sociales ONG,
            particulares, empresas e instituciones públicas en proyectos de desarrollo y acción
            social donde se promueve las habilidades de los niños, niñas o adolescentes con
            discapacidad en vulneración, para aprovechar su potencial y de esta manera se
            conviertan en personas productivas ante la sociedad, a la vez se pretende brindar
            beneficios de Educación, nutrición, salud, talleres, y una buena formación en el
            manejo de sus hábitos saludables.
          </p>
          <p>
            Para lograr con ellos grandes cambios, promoviendo valores personales,
            espirituales, familiares sociales y ambientales que aporten felicidad y esperanza.
          </p>

          <hr />
          <h3>Visión</h3>
          <p>
            La fundación son luz: Sera una Institución donde se Contribuirá en el beneficio de
            los niños niñas o adolescentes con discapacidad en vulneración, creando un mundo
            compatible en la convivencia comunitaria, familiar, ámbito social y cultural.
            Ofreciendo una mejor calidad de vida.
          </p>
        </div>
      </section>
    </article>
  </Layout>
);

export default IndexPage;
