import React, { useState } from 'react';
import Layout from '../components/Layout';
import emailjs from 'emailjs-com';

const Contact = () => {
  const [status, setStatus] = useState("PENDING");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const isValidData = () => 
    !!name && !!email && !!phone && !!message;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValidData()) return;

    try {
      setStatus("SENDING");
      await emailjs.sendForm('service_r0k1qry', 'template_eyjio8e', e.target, 'user_V0OlSoRrl1zQsDyIoIFbb');
      console.log('mensaje exitoso')
      setStatus("SENT");
    } catch (error) {
      setStatus("ERROR");
    }
  }

  const getSubmitLabel = () => {
    if (status === "SENDING") {
      return "Enviando mensaje";
    } else if (status === "SENT") {
      return "Mensaje enviado";
    } else {
      return "Enviar mensaje";
    }
  }

  const isSubmitDisabled = () => 
    status === "SENT" || status === "SENDING" || !isValidData()

  return (
    <Layout fullMenu>
      <article id="main">
        <header>
          <h2>Contáctanos</h2>
          <p>Estamos atentos a resolver tus dudas</p>
        </header>
        <section className="wrapper style5">
          <div className="inner">
          <section>
            <h4>Formulario de contacto</h4>
            <form onSubmit={handleSubmit}>
              <div className="row gtr-uniform">
                <div className="col-12 col-12-xsmall">
                  <input type="text" name="from_name" id="from_name" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre" />
                </div>
                <div className="col-6 col-12-xsmall">
                  <input type="email" name="from_mail" id="from_mail" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
                </div>
                <div className="col-6 col-12-xsmall">
                  <input type="text" min={3000000000} max={3999999999} name="from_phone" id="from_phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Número de teléfono" />
                </div>
                <div className="col-12">
                  <textarea name="message" id="message" value={message} onChange={e => setMessage(e.target.value)} placeholder="Ingresa tu mensaje" rows="6"></textarea>
                </div>
                <div className="col-12">
                  <ul className="actions">
                    <li><input type="submit" disabled={isSubmitDisabled()} value={getSubmitLabel()} className="primary" /></li>
                    <li><input type="reset" value="Reset" /></li>
                  </ul>
                </div>
              </div>
            </form>
          </section>
          </div>
        </section>
      </article>
    </Layout>
  )
};

export default Contact;
