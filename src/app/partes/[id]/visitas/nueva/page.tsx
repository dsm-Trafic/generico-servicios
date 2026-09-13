import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { createVisit } from '@/app/actions/work-orders';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';

type WorkOrder = {
  id: string;
  client_name: string;
  description: string;
  status: string;
  total_cents: number | null;
  assigned_technician_id: string;
};

export default async function NewVisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const order = db.prepare(`SELECT w.*,c.name client_name FROM work_orders w
    JOIN clients c ON c.id=w.client_id WHERE w.id=?`).get(id) as WorkOrder | undefined;
  if (!order || user.role !== 'TECNICO' || order.assigned_technician_id !== user.id || order.status === 'TERMINADO') notFound();
  if (db.prepare('SELECT id FROM visits WHERE work_order_id=? AND ended_at IS NULL').get(id)) notFound();
  const appointments = db.prepare(`SELECT id,scheduled_at,notes FROM appointments
    WHERE work_order_id=? AND assigned_technician_id=?
    AND status NOT IN ('REALIZADA','CANCELADA') ORDER BY scheduled_at`).all(id, user.id) as
    { id: string; scheduled_at: string | null; notes: string | null }[];

  return <AppShell>
    <p><Link href={`/partes/${id}`}>Volver al trabajo</Link></p>
    <h1>Iniciar visita</h1>
    <p>{order.client_name} · {order.description}</p>
    <section className="card"><form action={createVisit.bind(null, id)} className="form">
      {appointments.length > 0 && <label>Cita relacionada<select name="appointmentId"><option value="">Visita sin cita previa</option>{appointments.map((appointment) => <option key={appointment.id} value={appointment.id}>{appointment.scheduled_at ? new Date(appointment.scheduled_at).toLocaleString('es-UY') : 'Sin fecha'} · {appointment.notes ?? 'Sin notas'}</option>)}</select></label>}
      <label>Fecha<input name="visitDate" type="date" required /></label>
      <label>Hora de inicio<input name="startedAt" type="datetime-local" required /></label>
      {order.total_cents === null && <>
        <h2>Condiciones del trabajo</h2>
        <label>Coste total (UYU)<input name="total" required /></label>
        <label>Modalidad<select name="collectionMode"><option value="CONTADO">Contado</option><option value="FINANCIADO">Financiado</option><option value="DEUDA_ABIERTA">Deuda abierta</option></select></label>
        <label>Cuotas previstas (opcional)<input name="plannedInstallments" type="number" min="1" /></label>
        <p className="muted">El importe y el técnico quedarán fijos al iniciar esta primera visita.</p>
      </>}
      <button>Iniciar parte de visita</button>
    </form></section>
  </AppShell>;
}
