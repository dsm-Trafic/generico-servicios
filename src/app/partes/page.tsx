import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { createWorkOrder } from '@/app/actions/work-orders';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatUyu } from '@/lib/money';
import {
  statusDisplay,
  type WorkOrderStatus,
  workOrderTypeLabel,
} from '@/lib/work-order-display';

type WorkOrderRow = {
  id: string;
  client_name: string;
  technician_name: string;
  type: string;
  status: WorkOrderStatus;
  total_cents: number | null;
  paid_cents: number;
  visit_count: number;
};

export default async function WorkOrders({ searchParams }: {
  searchParams: Promise<{ appointmentId?: string; clientId?: string }>;
}) {
  const user = await requireUser();
  const query = await searchParams;
  const appointment = query.appointmentId
    ? db.prepare('SELECT client_id,assigned_technician_id FROM appointments WHERE id=?')
        .get(query.appointmentId) as { client_id: string; assigned_technician_id: string | null } | undefined
    : undefined;
  const clients = db.prepare("SELECT id,name FROM clients WHERE status='ACTIVO' ORDER BY name")
    .all() as { id: string; name: string }[];
  const technicians = db.prepare("SELECT id,name FROM users WHERE role='TECNICO' ORDER BY name")
    .all() as { id: string; name: string }[];
  const baseQuery = `SELECT w.*,c.name client_name,u.name technician_name,
    COALESCE((SELECT SUM(amount_cents) FROM payments WHERE work_order_id=w.id),0) paid_cents,
    (SELECT COUNT(*) FROM visits WHERE work_order_id=w.id) visit_count
    FROM work_orders w JOIN clients c ON c.id=w.client_id
    JOIN users u ON u.id=w.assigned_technician_id`;
  const orders = (user.role === 'ADMIN'
    ? db.prepare(`${baseQuery} ORDER BY w.created_at DESC`).all()
    : db.prepare(`${baseQuery} WHERE w.assigned_technician_id=? ORDER BY w.created_at DESC`).all(user.id)) as WorkOrderRow[];
  const fromAppointment = Boolean(
    appointment && (user.role === 'ADMIN' || appointment.assigned_technician_id === user.id),
  );

  return <AppShell>
    <h1>Trabajos</h1>
    <div className="grid">
      <section className="card">
        <h2>{fromAppointment ? 'Crear trabajo para la cita' : user.role === 'ADMIN' ? 'Nuevo trabajo' : 'Nueva urgencia'}</h2>
        {clients.length === 0 ? <p>Primero crea un cliente activo.</p> :
          <form action={createWorkOrder} className="form">
            {fromAppointment && <input type="hidden" name="appointmentId" value={query.appointmentId} />}
            <label>Cliente<select name="clientId" required defaultValue={appointment?.client_id ?? query.clientId ?? ''}>
              <option value="" disabled>Seleccionar cliente</option>
              {clients.map((client) => <option value={client.id} key={client.id}>{client.name}</option>)}
            </select></label>
            {user.role === 'ADMIN' && <label>Técnico<select name="technicianId" required defaultValue={appointment?.assigned_technician_id ?? ''}>
              <option value="" disabled>Seleccionar técnico</option>
              {technicians.map((technician) => <option value={technician.id} key={technician.id}>{technician.name}</option>)}
            </select></label>}
            <label>Tipo<select name="type" required>
              {user.role === 'TECNICO' && !fromAppointment ? <option value="URGENCIA">Urgencia</option> : <>
                <option value="TRABAJO_GENERAL">Trabajo general</option>
                <option value="URGENCIA">Urgencia</option>
                <option value="MANTENIMIENTO">Mantenimiento</option>
                <option value="SOLICITUD_PRESUPUESTO">Solicitud de presupuesto</option>
              </>}
            </select></label>
            <label>Trabajo a realizar<textarea name="description" required /></label>
            <button>Crear trabajo</button>
          </form>}
      </section>
      <section className="card">
        <h2>Listado</h2>
        {orders.length === 0 ? <p className="muted">No hay trabajos registrados.</p> :
          <table className="table"><thead><tr><th>Cliente y trabajo</th><th>Estado</th><th>Importe / saldo</th><th>Técnico</th></tr></thead><tbody>
            {orders.map((order) => {
              const display = statusDisplay(order.status);
              const total = order.total_cents ?? 0;
              return <tr key={order.id}><td><Link href={`/partes/${order.id}`}>{order.client_name}</Link><br /><span className="muted">{workOrderTypeLabel(order.type)} · {order.visit_count} visitas</span></td><td><span className={`badge badge-${display.tone}`}>{display.label}</span></td><td>{order.total_cents === null ? 'Por fijar' : <>{formatUyu(total)}<br /><span className="muted">Saldo {formatUyu(total - order.paid_cents)}</span></>}</td><td>{order.technician_name}</td></tr>;
            })}
          </tbody></table>}
      </section>
    </div>
  </AppShell>;
}
