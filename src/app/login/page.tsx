import { currentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { loginAction } from '../actions';
export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}){
 if(await currentUser()) redirect('/');
 const query=await searchParams;
 return <main className="login card"><h1>Genérico Servicios</h1><p className="muted">Acceso local de oficina y técnicos</p>
  {query.error&&<p className="danger">Correo o contraseña incorrectos.</p>}
  <form action={loginAction} className="form"><label>Correo<input name="email" type="email" required placeholder="admin@example.local"/></label><label>Contraseña<input name="password" type="password" required/></label><button>Entrar</button></form>
  <p className="muted">Prueba: admin@example.local / Cambiar-Admin-123</p></main>
}
