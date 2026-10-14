import Link from 'next/link';
import { LockKeyhole, ArrowLeft } from 'lucide-react';
import { Sun } from '@/components/sun';
import { LoginForm } from '@/components/admin/login-form';
import { authConfigured, canEdit } from '@/lib/server/editor-auth';
import { cmsConfigured } from '@/lib/server/cms';
import { localPreviewEnabled } from '@/lib/local-preview';
import { redirect } from 'next/navigation';
export default async function Login() {
  const enabled = authConfigured() && cmsConfigured();
  if (enabled && (await canEdit())) redirect('/admin');
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
          {enabled
            ? 'Inicia sesión para crear, editar y publicar las historias de la fundación.'
            : 'El acceso del equipo requiere configurar las credenciales y conectar el backend. Por seguridad, permanece cerrado hasta entonces.'}
        </p>
        <LoginForm enabled={enabled} />
        <p className="form-note">
          La vista previa local permite revisar el editor sin utilizar cuentas
          reales.
        </p>
        {localPreviewEnabled() && (
          <Link href="/admin" className="text-link">
            Abrir panel de revisión local
          </Link>
        )}
        <Link href="/" className="text-link">
          <ArrowLeft size={15} /> Volver a la fundación
        </Link>
      </section>
      <p className="login-bottom">Fundación Son Luz · Niños del mañana</p>
    </main>
  );
}
