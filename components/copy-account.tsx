'use client';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { foundation } from '@/lib/content';
export function CopyAccount() {
  const [message, setMessage] = useState('');
  async function copy() {
    try {
      await navigator.clipboard.writeText(foundation.account);
      setMessage('Número copiado');
    } catch {
      setMessage(
        'No se pudo copiar. Selecciona el número para copiarlo manualmente.'
      );
    }
  }
  return (
    <div>
      <button onClick={copy} className="copy-account">
        {message === 'Número copiado' ? (
          <Check size={17} />
        ) : (
          <Copy size={17} />
        )}{' '}
        Copiar número de cuenta
      </button>
      <p className="form-message" role="status">
        {message}
      </p>
    </div>
  );
}
