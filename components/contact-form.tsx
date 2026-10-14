'use client';
import { useState } from 'react';
import emailjs from '@emailjs/browser';
import { ArrowUpRight, Check } from 'lucide-react';
import { foundation } from '@/lib/content';
export function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle'
  );
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'sending' || status === 'sent') return;
    const form = event.currentTarget;
    setStatus('sending');
    try {
      await emailjs.sendForm('service_r0k1qry', 'template_eyjio8e', form, {
        publicKey: 'user_V0OlSoRrl1zQsDyIoIFbb',
      });
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  }
  return (
    <form onSubmit={submit} className="contact-form">
      <h2>Formulario de contacto</h2>
      <div className="form-grid">
        <label>
          Nombre completo
          <input
            name="from_name"
            autoComplete="name"
            required
            maxLength={150}
            placeholder="Tu nombre"
          />
        </label>
        <label>
          Correo electrónico
          <input
            name="from_mail"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="tu@correo.com"
          />
        </label>
      </div>
      <label>
        Teléfono
        <input
          name="from_phone"
          type="tel"
          autoComplete="tel"
          required
          maxLength={30}
          placeholder="Tu número de contacto"
        />
      </label>
      <label>
        Mensaje
        <textarea
          name="message"
          required
          maxLength={5000}
          rows={5}
          placeholder="Cuéntanos cómo podemos ayudarte"
        />
      </label>
      <p className="form-note">
        Tus datos se utilizarán para responder a tu mensaje.
      </p>
      <button
        className="button button-green"
        type="submit"
        disabled={status === 'sending' || status === 'sent'}
      >
        {status === 'sent'
          ? 'Mensaje enviado'
          : status === 'sending'
            ? 'Enviando mensaje…'
            : 'Enviar mensaje'}
        {status === 'sent' ? <Check size={17} /> : <ArrowUpRight size={17} />}
      </button>
      <div aria-live="polite" className="form-message">
        {status === 'sent' &&
          'Gracias por escribirnos. Tu mensaje ha sido enviado.'}
        {status === 'error' && (
          <>
            No pudimos enviar el mensaje. Inténtalo de nuevo o escríbenos a{' '}
            <a href={`mailto:${foundation.email}`}>{foundation.email}</a>.
          </>
        )}
      </div>
    </form>
  );
}
