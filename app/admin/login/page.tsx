import Link from 'next/link';
import { LockKeyhole, ArrowLeft } from 'lucide-react';
import { Sun } from '@/components/sun';
export default function Login() {
  return (
    <main className="admin-login">
      <div className="login-brand">
        <Sun />
        <span>Fundación Son Luz</span>
      </div>
      <section className="login-card">
        <LockKeyhole size={26} strokeWidth={1.3} />
        <span className="eyebrow">Espacio editorial privado</span>
        <h1>
          Las historias
          <br />
          comienzan <em>aquí.</em>
        </h1>
        <p>
          El acceso del equipo se habilitará cuando conectemos la autenticación
          y la base de datos. Por seguridad, el panel no acepta contraseñas ni
          publica contenido todavía.
        </p>
        <label>
          Correo electrónico
          <input
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            disabled
          />
        </label>
        <button className="button button-green" disabled>
          Acceso pendiente de configuración
        </button>
        <p className="form-note">
          La vista previa local permite revisar el editor sin utilizar cuentas
          reales.
        </p>
        <Link href="/" className="text-link">
          <ArrowLeft size={15} /> Volver a la fundación
        </Link>
      </section>
      <p className="login-bottom">Fundación Son Luz · Niños del mañana</p>
    </main>
  );
}
