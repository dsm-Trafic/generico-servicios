import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { db } from '@/lib/db';
import { formatUyu } from '@/lib/money';
import { requireUser } from '@/lib/auth';
import { archiveClient, restoreClient, updateClient } from '@/app/actions/clients';
import { statusDisplay, type WorkOrderStatus, workOrderTypeLabel } from '@/lib/work-order-display';

export default async function ClientHistory({params}:{params:Promise<{id:string}>}){
 const {id}=await params; const user=await requireUser();
 const client=db.prepare('SELECT * FROM clients WHERE id=?').get(id) as {name:string;phone:string;email:string|null;address:string|null;status:string}|undefined;
 if(!client) notFound();
 const orders=db.prepare(`SELECT w.*,u.name technician_name,
   COALESCE((SELECT SUM(amount_cents) FROM payments WHERE work_order_id=w.id),0) paid_cents,
   (SELECT COUNT(*) FROM visits WHERE work_order_id=w.id) visit_count
   FROM work_orders w JOIN users u ON u.id=w.assigned_technician_id
   WHERE w.client_id=? ORDER BY w.created_at DESC`).all(id) as
   {id:string;description:string;type:string;status:WorkOrderStatus;total_cents:number|null;technician_name:string;paid_cents:number;visit_count:number}[];
 return <AppShell><h1>{client.name}</h1><p>{client.phone} · {client.email??'Sin correo'} · {client.address??'Sin dirección'} · {client.status==='ACTIVO'?'Activo':'Archivado'}</p><div className="grid"><section className="card"><h2>Actualizar cliente</h2><form action={updateClient.bind(null,id)} className="form"><label>Nombre<input name="name" defaultValue={client.name} required/></label><label>Teléfono<input name="phone" defaultValue={client.phone} required/></label><label>Correo<input name="email" type="email" defaultValue={client.email??''}/></label><label>Dirección<input name="address" defaultValue={client.address??''}/></label><button>Guardar cambios</button></form>{user.role==='ADMIN'&&<form action={(client.status==='ACTIVO'?archiveClient:restoreClient).bind(null,id)}><button>{client.status==='ACTIVO'?'Archivar cliente':'Restaurar cliente'}</button></form>}</section><section className="card"><h2>Historial completo</h2>{orders.length===0?<p className="muted">Todavía no hay trabajos registrados.</p>:<table className="table"><thead><tr><th>Trabajo</th><th>Estado</th><th>Importe / saldo</th></tr></thead><tbody>{orders.map(o=>{const display=statusDisplay(o.status);const total=o.total_cents??0;return <tr key={o.id}><td><Link href={`/partes/${o.id}`}>{workOrderTypeLabel(o.type)}: {o.description}</Link><br/><span className="muted">{o.technician_name} · {o.visit_count} visitas</span></td><td><span className={`badge badge-${display.tone}`}>{display.label}</span></td><td>{o.total_cents===null?'Por fijar':<>{formatUyu(total)}<br/><span className="muted">Saldo {formatUyu(total-o.paid_cents)}</span></>}</td></tr>})}</tbody></table>}</section></div></AppShell>;
}
