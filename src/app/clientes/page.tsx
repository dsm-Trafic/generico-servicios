import { AppShell } from '@/components/app-shell';
import { db } from '@/lib/db';
import { createClient } from '../actions/clients';
import Link from 'next/link';
export default async function Clients({searchParams}:{searchParams:Promise<{q?:string}>}){
 const q=(await searchParams).q?.trim()??''; const like=`%${q}%`;
 const clients=db.prepare(`SELECT * FROM clients
   WHERE name LIKE ? OR phone LIKE ? ORDER BY status,name`).all(like,like) as
   {id:string;name:string;phone:string;email:string|null;address:string|null;status:string}[];
 return <AppShell><h1>Clientes</h1><div className="grid"><section className="card"><h2>Nuevo cliente</h2><p className="muted">Disponible para Oficina y técnicos.</p><form action={createClient} className="form"><label>Nombre<input name="name" required/></label><label>Teléfono<input name="phone" required/></label><label>Correo<input name="email" type="email"/></label><label>Dirección<input name="address"/></label><button>Guardar cliente</button></form></section><section className="card"><form className="form"><label>Buscar por nombre o teléfono<input name="q" defaultValue={q}/></label><button>Buscar</button></form><table className="table"><thead><tr><th>Cliente</th><th>Teléfono</th><th>Estado</th></tr></thead><tbody>{clients.map(c=><tr key={c.id}><td><Link href={`/clientes/${c.id}`}>{c.name}</Link><br/><span className="muted">{c.email??'Sin correo'}</span></td><td>{c.phone}</td><td><span className="badge">{c.status==='ACTIVO'?'Activo':'Archivado'}</span></td></tr>)}</tbody></table></section></div></AppShell>
}
