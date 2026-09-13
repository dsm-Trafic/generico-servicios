import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { loginAction } from '../actions/auth';

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentUser()) redirect('/');
  const query = await searchParams;

  return <main className="login-page">
    <section className="login-intro">
      <div className="brand brand-light"><span className="brand-mark" aria-hidden="true">GS</span><span><strong>Genérico</strong><small>Servicios técnicos</small></span></div>
      <div><p className="eyebrow">Sistema local · etapa 1</p><h1>El servicio completo, desde la cita hasta el cobro.</h1><p>Oficina organiza. El técnico resuelve. Cada visita queda registrada.</p></div>
      <ol className="login-points"><li><span>01</span>Agenda y clientes</li><li><span>02</span>Partes y materiales</li><li><span>03</span>Deudas e informes</li></ol>
    </section>
    <section className="login-panel">
      <div className="login-card"><p className="eyebrow">Acceso seguro</p><h2>Entrar al sistema</h2><p className="muted">Utiliza tu cuenta de Oficina o Técnico.</p>
        {query.error && <p className="form-error" role="alert">Correo o contraseña incorrectos.</p>}
        <form action={loginAction} className="form"><label>Correo electrónico<input name="email" type="email" required placeholder="admin@example.local" autoComplete="username" /></label><label>Contraseña<input name="password" type="password" required autoComplete="current-password" /></label><button>Entrar al panel</button></form>
        <div className="demo-note"><strong>Cuenta de prueba</strong><span>admin@example.local</span><span>Cambiar-Admin-123</span></div>
      </div>
    </section>
  </main>;
}
