import React from "react";
import Layout from '../components/Layout';
import { Link } from 'gatsby';

const Donate = () => (
  <Layout fullMenu>
    <article id="main">
      <header>
        <h2>Dona tu granito de arena</h2>
        <p>Aquí encuentras nuestros datos para que puedas donar.</p>
      </header>
      <section className="wrapper style5">
        <div className="inner">

          <section>
            <h4>Cuentas de ahorro</h4>
            <p>Estos son los datos de nuestra cuenta de ahorros <b>Bancolombia</b>.</p>
            <p>Ahorros, Bancolombia</p>
            <p>#411-000002-42</p>
            <hr />
            <header>
              <h4>¿Quieres donar tu tiempo, alimentos o algo distinto a dinero?</h4>
              <p>Si quieres donar algo distinto a dinero o aun no estás seguro de en qué se va a utilizar tu donación, contáctanos!</p>
            </header>
            <Link to="/contact" className="button primary">Contáctanos</Link>
          </section>
        </div>
      </section>
    </article>
  </Layout>
);

export default Donate;