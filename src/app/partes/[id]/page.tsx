import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { createAppointment } from '@/app/actions/appointments';
import {
  addMaterialUsage,
  completeVisit,
  createBudget,
  recordPayment,
} from '@/app/actions/work-orders';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatUyu } from '@/lib/money';
import {
  statusDisplay,
  type WorkOrderStatus,
  workOrderTypeLabel,
} from '@/lib/work-order-display';

type WorkOrder = {
  id: string;
  client_id: string;
  client_name: string;
  description: string;
  type: string;
  status: WorkOrderStatus;
  total_cents: number | null;
  collection_mode: string | null;
  planned_installments: number | null;
  assigned_technician_id: string;
  technician_name: string;
};
type Visit = { id:string; visit_date:string; started_at:string|null; ended_at:string|null; notes:string|null };
type Usage = { id:string; visit_id:string; name:string; model:string; quantity:number; unit_cost_cents_snapshot:number };
type Payment = { id:string; visit_id:string; amount_cents:number; method:string };

export default async function WorkOrderDetail({ params }: { params: Promise<{ id:string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const order = db.prepare(`SELECT w.*,c.name client_name,u.name technician_name
    FROM work_orders w JOIN clients c ON c.id=w.client_id
    JOIN users u ON u.id=w.assigned_technician_id WHERE w.id=?`).get(id) as WorkOrder | undefined;
  if (!order) notFound();
  if (user.role !== 'ADMIN' && order.assigned_technician_id !== user.id) notFound();

  const visits = db.prepare(`SELECT * FROM visits WHERE work_order_id=?
    ORDER BY visit_date DESC,created_at DESC`).all(id) as Visit[];
  const usages = db.prepare(`SELECT mu.*,m.name,m.model FROM material_usages mu
    JOIN materials m ON m.id=mu.material_id JOIN visits v ON v.id=mu.visit_id
    WHERE v.work_order_id=? ORDER BY mu.created_at DESC`).all(id) as Usage[];
  const payments = db.prepare(`SELECT * FROM payments WHERE work_order_id=?
    ORDER BY received_at DESC`).all(id) as Payment[];
  const materials = db.prepare("SELECT id,name,model FROM materials WHERE status='ACTIVO' ORDER BY name,model")
    .all() as { id:string; name:string; model:string }[];
  const previous = db.prepare(`SELECT w.id,w.description,w.type,w.status,w.total_cents,
    COALESCE(SUM(p.amount_cents),0) paid_cents,u.name technician_name
    FROM work_orders w JOIN users u ON u.id=w.assigned_technician_id
    LEFT JOIN payments p ON p.work_order_id=w.id
    WHERE w.client_id=? AND w.id<>? GROUP BY w.id ORDER BY w.created_at DESC`)
    .all(order.client_id, id) as { id:string; description:string; type:string; status:WorkOrderStatus; total_cents:number|null; paid_cents:number; technician_name:string }[];
  const budgets = db.prepare('SELECT * FROM budgets WHERE work_order_id=? ORDER BY created_at DESC')
    .all(id) as { id:string; total_cents:number; status:string }[];
  const openVisit = visits.find((visit) => !visit.ended_at);
  const total = order.total_cents ?? 0;
  const paid = payments.reduce((sum, payment) => sum + payment.amount_cents, 0);
  const display = statusDisplay(order.status);
  const canOperate = user.role === 'TECNICO' && user.id === order.assigned_technician_id;

  return <AppShell>
    <p><Link href="/partes">Volver a trabajos</Link></p>
    <h1>{order.client_name}</h1>
    <p>{workOrderTypeLabel(order.type)} · {order.description}</p>
    <p><span className={`badge badge-${display.tone}`}>{display.label}</span> · {order.technician_name}</p>
    <div className="grid">
      <section className="card"><h2>Resumen económico</h2>
        <p>Total: <strong>{order.total_cents === null ? 'Se fija en la primera visita' : formatUyu(total)}</strong></p>
        <p>Cobrado: {formatUyu(paid)}</p><p className="amount">Saldo: {formatUyu(total - paid)}</p>
        <p>Modalidad: {order.collection_mode ?? 'Sin fijar'}{order.planned_installments ? ` · ${order.planned_installments} cuotas previstas` : ''}</p>
        {canOperate && !openVisit && order.status !== 'TERMINADO' && <p><Link className="button" href={`/partes/${id}/visitas/nueva`}>Iniciar visita</Link></p>}
      </section>
      <section className="card"><h2>Programar próxima visita</h2>
        {order.status === 'TERMINADO' ? <p className="muted">El trabajo está terminado. Los adicionales se registran como trabajo anexo.</p> :
          <form action={createAppointment} className="form"><input type="hidden" name="clientId" value={order.client_id} /><input type="hidden" name="workOrderId" value={order.id} /><label>Fecha y hora<input name="scheduledAt" type="datetime-local" /></label><label>Notas<textarea name="notes" placeholder="Motivo o trabajo previsto" /></label><button>Guardar cita</button></form>}
      </section>
    </div>
    {openVisit && <section className="visit-active card"><h2>Visita en curso · {openVisit.visit_date}</h2><p>Inicio: {openVisit.started_at}</p>
      {canOperate ? <div className="grid">
        <section><h3>Material utilizado</h3>{materials.length === 0 ? <p className="muted">Oficina debe crear materiales antes de registrarlos.</p> : <form action={addMaterialUsage.bind(null, openVisit.id)} className="form"><label>Material<select name="materialId" required>{materials.map((material) => <option key={material.id} value={material.id}>{material.name} · {material.model}</option>)}</select></label><label>Cantidad<input name="quantity" type="number" min="1" required /></label><button>Añadir material</button></form>}</section>
        <section><h3>Registrar cobro</h3><form action={recordPayment.bind(null, openVisit.id)} className="form"><label>Importe<input name="amount" required /></label><label>Medio<select name="method"><option value="EFECTIVO">Efectivo</option><option value="TRANSFERENCIA">Transferencia</option><option value="MERCADO_PAGO">Mercado Pago</option></select></label><button>Registrar cobro</button></form></section>
        <section><h3>Cerrar parte</h3><form action={completeVisit.bind(null, openVisit.id)} className="form"><label>Hora final<input name="endedAt" type="datetime-local" required /></label><label>Descripción del trabajo realizado<textarea name="notes" required /></label><label>Resultado<select name="resultingStatus"><option value="EN_PROCESO">Continúa en proceso</option><option value="TERMINADO">Trabajo terminado</option></select></label><button>Cerrar visita</button></form></section>
      </div> : <p>La visita debe completarla el técnico asignado.</p>}
    </section>}
    <div className="grid">
      <section className="card"><h2>Partes de visita</h2>{visits.length === 0 ? <p className="muted">Todavía no hay visitas.</p> : visits.map((visit) => <article className="record" key={visit.id}><h3>{visit.visit_date} · {visit.ended_at ? 'Realizada' : 'En curso'}</h3><p>{visit.started_at ?? 'Sin inicio'} — {visit.ended_at ?? 'Abierta'}</p><p>{visit.notes ?? 'Sin descripción todavía'}</p><ul>{usages.filter((usage) => usage.visit_id === visit.id).map((usage) => <li key={usage.id}>{usage.name} · {usage.model}: {usage.quantity} ({formatUyu(usage.unit_cost_cents_snapshot)} c/u)</li>)}</ul><ul>{payments.filter((payment) => payment.visit_id === visit.id).map((payment) => <li key={payment.id}>Cobro {formatUyu(payment.amount_cents)} · {payment.method.replace('_', ' ')}</li>)}</ul></article>)}</section>
      <section className="card"><h2>Historial del cliente</h2>{previous.length === 0 ? <p className="muted">No hay otros trabajos.</p> : previous.map((item) => { const itemTotal = item.total_cents ?? 0; return <article className="record" key={item.id}><h3><Link href={`/partes/${item.id}`}>{workOrderTypeLabel(item.type)}</Link></h3><p>{item.description}</p><p>{item.technician_name} · {statusDisplay(item.status).label} · Saldo {formatUyu(itemTotal - item.paid_cents)}</p></article>; })}</section>
    </div>
    {user.role === 'ADMIN' && order.type === 'SOLICITUD_PRESUPUESTO' && <section className="card"><h2>Presupuesto</h2>{budgets.map((budget) => <p key={budget.id}>{budget.status}: {formatUyu(budget.total_cents)}</p>)}<form action={createBudget.bind(null, id)} className="form"><label>Concepto<input name="concept" required /></label><label>Cantidad<input name="quantity" type="number" min="1" defaultValue="1" required /></label><label>Precio unitario<input name="unitPrice" required /></label><button>Crear presupuesto</button></form></section>}
  </AppShell>;
}
