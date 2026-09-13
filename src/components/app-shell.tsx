import Link from 'next/link';
import { logoutAction } from '@/app/actions/auth';
import { requireUser } from '@/lib/auth';

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const isAdmin = user.role === 'ADMIN';

  return <div className="app-frame">
    <header className="masthead">
      <div className="masthead-inner">
        <Link className="brand" href="/" aria-label="Genérico Servicios, inicio">
          <span className="brand-mark" aria-hidden="true">GS</span>
          <span><strong>Genérico</strong><small>Servicios técnicos</small></span>
        </Link>
        <div className="session-block">
          <span className="role-tag">{isAdmin ? 'Oficina' : 'Técnico'}</span>
          <span className="session-name">{user.name}</span>
          <form action={logoutAction}><button className="logout-button">Salir</button></form>
        </div>
      </div>
      <nav className="nav" aria-label="Navegación principal">
        <div className="nav-inner">
          <Link href="/">Panel</Link>
          <Link href="/clientes">Clientes</Link>
          <Link href="/citas">Citas</Link>
          <Link href="/partes">Trabajos</Link>
          {isAdmin && <><Link href="/materiales">Materiales</Link><Link href="/proveedores">Proveedores</Link><Link href="/informes">Informes</Link></>}
        </div>
      </nav>
    </header>
    <main className="shell">{children}</main>
    <footer className="site-footer"><span>Genérico Servicios</span><span>Operación local · etapa 1</span></footer>
  </div>;
}
