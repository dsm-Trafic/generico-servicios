import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { db } from '@/lib/db';
import { formatUyu } from '@/lib/money';

export default async function ClientHistory({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const client=db.prepare('SELECT * FROM clients WHERE id=?').get(id) as {name:string;phone:string;email:string|null;address:string|null}|undefined;
 if(!client) notFound();
 const orders=db.prepare(`SELECT w.*,u.name technician_name FROM work_orders w LEFT JOIN users u ON u.id=w.assigned_technician_id WHERE w.client_id=? AND w.status='TERMINADO' ORDER BY w.closed_at DESC`).all(id) as {id:string;description:string;total_cents:number;technician_name:string|null}[];
 return <AppShell><h1>{client.name}</h1><p>{client.phone} · {client.email??'Sin correo'} · {client.address??'Sin dirección'}</p><section className="card"><h2>Historial terminado</h2>{orders.length===0?<p className="muted">Todavía no hay trabajos terminados.</p>:<table className="table"><thead><tr><th>Trabajo</th><th>Técnico</th><th>Importe</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td><Link href={`/partes/${o.id}`}>{o.description}</Link></td><td>{o.technician_name??'—'}</td><td>{formatUyu(o.total_cents)}</td></tr>)}</tbody></table>}</section></AppShell>;
}
