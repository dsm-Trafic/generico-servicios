import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { logoutAction } from '@/app/actions/auth';
export async function AppShell({children}:{children:React.ReactNode}){
 const user=await requireUser();
 return <main className="shell"><header className="top"><div><strong>Genérico Servicios</strong><div className="muted">{user.name} · {user.role==='ADMIN'?'Oficina':'Técnico'}</div></div><nav className="nav"><Link href="/">Inicio</Link><Link href="/clientes">Clientes</Link><Link href="/citas">Citas</Link><Link href="/partes">Trabajos</Link>{user.role==='ADMIN'&&<><Link href="/materiales">Materiales</Link><Link href="/proveedores">Proveedores</Link><Link href="/informes">Informes</Link></>}<form action={logoutAction}><button>Salir</button></form></nav></header>{children}</main>
}
