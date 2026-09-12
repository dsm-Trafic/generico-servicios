import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { formatUyu } from '@/lib/money';
import { addMaterial, addMovement, completeWorkOrder, createBudget, startWorkOrder } from '@/app/actions';
type Order={id:string;client_id:string;client_name:string;description:string;type:string;status:string;total_cents:number;started_at:string|null;duration_minutes:number|null;technician_name:string|null};
export default async function WorkOrderDetail({params}:{params:Promise<{id:string}>}){
 const {id}=await params; const user=await requireUser();
 const order=db.prepare(`SELECT w.*,c.name client_name,u.name technician_name FROM work_orders w JOIN clients c ON c.id=w.client_id LEFT JOIN users u ON u.id=w.assigned_technician_id WHERE w.id=?`).get(id) as Order|undefined;
 if(!order) notFound();
 if(user.role!=='ADMIN'){const own=db.prepare('SELECT 1 ok FROM work_orders WHERE id=? AND assigned_technician_id=?').get(id,user.id);if(!own) notFound();}
 const materials=db.prepare('SELECT * FROM materials WHERE work_order_id=?').all(id) as {id:string;name:string;quantity:number}[];
 const movements=db.prepare('SELECT * FROM financial_movements WHERE applied_to_id=? ORDER BY created_at DESC').all(id) as {id:string;kind:string;amount_cents:number;payment_method:string|null;installment_count:number|null}[];
 const paid=movements.reduce((sum,m)=>sum+m.amount_cents,0);
 const eligible=db.prepare(`SELECT id,description,total_cents FROM work_orders WHERE client_id=? AND total_cents>(SELECT COALESCE(SUM(amount_cents),0) FROM financial_movements WHERE applied_to_id=work_orders.id) ORDER BY work_date DESC`).all(order.client_id) as {id:string;description:string;total_cents:number}[];
 const budgets=db.prepare('SELECT * FROM budgets WHERE work_order_id=?').all(id) as {id:string;total_cents:number;status:string}[];
 const canEdit=order.status!=='TERMINADO';
 return <AppShell><h1>{order.client_name}</h1><p>{order.description}</p><p><span className="badge">{order.status.replace('_',' ')}</span> · {order.technician_name??'Sin asignar'}</p><div className="grid">
  <section className="card"><h2>Trabajo</h2><p>Total: <strong>{formatUyu(order.total_cents)}</strong></p><p>Aplicado: {formatUyu(paid)}</p><p className="amount">Saldo: {formatUyu(order.total_cents-paid)}</p>{canEdit&&order.status==='PENDIENTE'&&<form action={startWorkOrder.bind(null,id)}><button>Iniciar parte</button></form>}{canEdit&&order.status==='EN_CURSO'&&<form action={completeWorkOrder.bind(null,id)} className="form"><label>Duración en minutos<input name="durationMinutes" type="number" min="1"/></label><button>Terminar parte</button></form>}</section>
  <section className="card"><h2>Materiales</h2><ul>{materials.map(m=><li key={m.id}>{m.name} · {m.quantity}</li>)}</ul>{canEdit&&<form action={addMaterial.bind(null,id)} className="form"><label>Material<input name="name" required/></label><label>Cantidad<input name="quantity" type="number" min="1" required/></label><button>Añadir material</button></form>}</section>
  <section className="card"><h2>Cobros y financiación</h2><ul>{movements.map(m=><li key={m.id}>{m.kind}: {formatUyu(m.amount_cents)} {m.payment_method??(`${m.installment_count} cuotas`)}</li>)}</ul>{eligible.length>0&&<form action={addMovement.bind(null,id)} className="form"><label>Aplicar al parte<select name="appliedToId">{eligible.map(e=><option key={e.id} value={e.id}>{e.description} · {formatUyu(e.total_cents)}</option>)}</select></label><label>Tipo<select name="kind"><option value="PAGO">Pago</option><option value="FINANCIACION">Financiación</option></select></label><label>Importe<input name="amount" required/></label><label>Medio<select name="paymentMethod"><option value="EFECTIVO">Efectivo</option><option value="TRANSFERENCIA">Transferencia</option><option value="MERCADO_PAGO">Mercado Pago</option></select></label><label>Cuotas si financia<input name="installmentCount" type="number" min="1"/></label><button>Registrar movimiento</button></form>}</section>
  {user.role==='ADMIN'&&order.type==='VISITA_PRESUPUESTO'&&<section className="card"><h2>Presupuesto</h2>{budgets.map(b=><p key={b.id}>{b.status}: {formatUyu(b.total_cents)}</p>)}<form action={createBudget.bind(null,id)} className="form"><label>Concepto<input name="concept" required/></label><label>Cantidad<input name="quantity" type="number" min="1" defaultValue="1" required/></label><label>Precio unitario<input name="unitPrice" required/></label><button>Crear presupuesto</button></form></section>}
 </div></AppShell>
}
