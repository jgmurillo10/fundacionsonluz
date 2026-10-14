'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function LoginForm({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setBusy(true);
        setError('');
        try {
          const response = await fetch('/api/editor/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: data.get('email'),
              password: data.get('password'),
            }),
          });
          const body = await response.json();
          if (!response.ok) throw new Error(body.error);
          router.replace('/admin');
          router.refresh();
        } catch (reason) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'No pudimos iniciar sesión.'
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Correo electrónico
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          disabled={!enabled || busy}
          maxLength={254}
        />
      </label>
      <label>
        Contraseña
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={!enabled || busy}
          maxLength={128}
        />
      </label>
      {error && (
        <p role="alert" className="form-message form-error">
          {error}
        </p>
      )}
      <button className="button button-green" disabled={!enabled || busy}>
        {!enabled
          ? 'Acceso pendiente de configuración'
          : busy
            ? 'Iniciando sesión…'
            : 'Entrar al espacio editorial'}
      </button>
    </form>
  );
}
