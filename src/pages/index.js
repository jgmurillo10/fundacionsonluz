import React from 'react';
import { Link } from 'gatsby';
import Layout from '../components/Layout';
import Scroll from '../components/Scroll';
import pic1 from '../assets/images/foto1.jpg';
import pic2 from '../assets/images/foto2.jpg';
import pic3 from '../assets/images/foto3.jpg';
import pic4 from '../assets/images/foto4.jpg';
import config from '../../config';
const IndexPage = () => (
  <Layout>
    <section id="banner">
      <div className="inner">
        <h2>{config.heading}</h2>
        <p>{config.subHeading}</p>
        <ul className="actions special">
          <li>
            <Scroll type="id" element="one">
              <a href="/#" className="button primary">
                Explora
              </a>
            </Scroll>
          </li>
        </ul>
      </div>
      <Scroll type="id" element="one">
        <a href="#one" className="more">
          Conoce más
        </a>
      </Scroll>
    </section>

    <section id="one" className="wrapper style1 special">
      <div className="inner">
        <header className="major">
          <h2>
          Buscamos alcanzar el desarrollo personal de cada
          niño y joven, perteneciente a la fundación.
          </h2>
          <p>
            Somos una entidad privada sin ánimo de lucro e
            independiente con el propósito de contribuir a la mejora social y al desarrollo de los niños o
            adolescentes con discapacidad en vulnerabilidad y el apoyo a su familia.
          </p>
          <Link className="button" to="/about">Conoce nuestra misión y visión</Link>
          {/* <a href="/about" className="button primary">Conoce nuestra misión y visión</a> */}
        </header>
        <ul className="icons major">
          <li>
            <span className="icon fa-heart major style1">
              <span className="label">Lorem</span>
            </span>
          </li>
          <li>
            <span className="icon fa-heart major style2">
              <span className="label">Ipsum</span>
            </span>
          </li>
          <li>
            <span className="icon solid fa-heart major style3">
              <span className="label">Dolor</span>
            </span>
          </li>
        </ul>
      </div>
    </section>

    <section id="two" className="wrapper alt style2">
      <section className="spotlight">
        <div className="image">
          <img src={pic1} alt="" />
        </div>
        <div className="content">
          <h2>
            Desarrollo
          </h2>
          <p>
            Buscamos promover el desarrollo de una serie de capacidades y la apropiación de
            determinados contenidos culturales necesarios para que los niños y jóvenes
            puedan participar e integrarse en su medio sociocultural.
          </p>
        </div>
      </section>
      <section className="spotlight">
        <div className="image">
          <img src={pic2} alt="" />
        </div>
        <div className="content">
          <h2>
            Igualdad
          </h2>
          <p>
            Queremos favorecer la igualdad de oportunidades, proporcionar una base de
            educación personalizada, fomentando la participación, la solidaridad y
            cooperación, mejorando la calidad de la calidad de vida.
          </p>
        </div>
      </section>
      <section className="spotlight">
        <div className="image">
          <img src={pic3} alt="" />
        </div>
        <div className="content">
          <h2>
            Conciencia
          </h2>
          <p>
            Esperamos concientizar, tanto a la Administración Pública como a Entidades Privadas,
            de la necesidad de apoyar este tipo de proyectos con sentido social.
          </p>
        </div>
      </section>
      <section className="spotlight">
        <div className="image">
          <img src={pic4} alt="" />
        </div>
        <div className="content">
          <h2>
            Apoyo
          </h2>
          <p>
          Buscamos desarrollar las estrategias de intervención y medidas de apoyo necesarias
          para detectar y atender las necesidades y características personales de los
          niños y jóvenes de la fundación.
          </p>
        </div>
      </section>
    </section>

    {/* <section id="three" className="wrapper style3 special">
      <div className="inner">
        <header className="major">
          <h2>Accumsan mus tortor nunc aliquet</h2>
          <p>
            Aliquam ut ex ut augue consectetur interdum. Donec amet imperdiet
            eleifend
            <br />
            fringilla tincidunt. Nullam dui leo Aenean mi ligula, rhoncus
            ullamcorper.
          </p>
        </header>
        <ul className="features">
          <li className="icon fa-paper-plane">
            <h3>Arcu accumsan</h3>
            <p>
              Augue consectetur sed interdum imperdiet et ipsum. Mauris lorem
              tincidunt nullam amet leo Aenean ligula consequat consequat.
            </p>
          </li>
          <li className="icon solid fa-laptop">
            <h3>Ac Augue Eget</h3>
            <p>
              Augue consectetur sed interdum imperdiet et ipsum. Mauris lorem
              tincidunt nullam amet leo Aenean ligula consequat consequat.
            </p>
          </li>
          <li className="icon solid fa-code">
            <h3>Mus Scelerisque</h3>
            <p>
              Augue consectetur sed interdum imperdiet et ipsum. Mauris lorem
              tincidunt nullam amet leo Aenean ligula consequat consequat.
            </p>
          </li>
          <li className="icon solid fa-headphones-alt">
            <h3>Mauris Imperdiet</h3>
            <p>
              Augue consectetur sed interdum imperdiet et ipsum. Mauris lorem
              tincidunt nullam amet leo Aenean ligula consequat consequat.
            </p>
          </li>
          <li className="icon fa-heart">
            <h3>Aenean Primis</h3>
            <p>
              Augue consectetur sed interdum imperdiet et ipsum. Mauris lorem
              tincidunt nullam amet leo Aenean ligula consequat consequat.
            </p>
          </li>
          <li className="icon fa-flag">
            <h3>Tortor Ut</h3>
            <p>
              Augue consectetur sed interdum imperdiet et ipsum. Mauris lorem
              tincidunt nullam amet leo Aenean ligula consequat consequat.
            </p>
          </li>
        </ul>
      </div>
    </section> */}

    <section id="cta" className="wrapper style4">
      <div className="inner">
        <header>
          <h2>Súmate a nuestro proyecto</h2>
          <p>
            Puedes contactarnos para saber más o para hacer donaciones a esta noble causa.
          </p>
        </header>
        <ul className="actions stacked">
          <li>
            <Link to="/donate" className="button fit primary">
              Donar
            </Link>
          </li>
          <li>
            <Link to="/contact" className="button fit">
              Contactar
            </Link>
          </li>
        </ul>
      </div>
    </section>
  </Layout>
);

export default IndexPage;
