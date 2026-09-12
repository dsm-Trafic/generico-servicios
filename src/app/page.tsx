import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
export default async function Dashboard(){
 const user=await requireUser(); const filter=user.role==='ADMIN'?'':' WHERE assigned_technician_id=?';
 const params=user.role==='ADMIN'?[]:[user.id];
 const counts=db.prepare(`SELECT status,COUNT(*) count FROM work_orders${filter} GROUP BY status`).all(...params) as {status:string;count:number}[];
 return <AppShell><h1>Panel de trabajo</h1><div className="grid">{['PENDIENTE','EN_CURSO','TERMINADO'].map(s=><section className="card" key={s}><span className="badge">{s.replace('_',' ')}</span><p className="amount">{counts.find(c=>c.status===s)?.count??0}</p></section>)}</div><p><Link className="button" href="/partes">Ver partes</Link></p></AppShell>
}
