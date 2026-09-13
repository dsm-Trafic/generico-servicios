import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { createAppointment } from '@/app/actions/appointments';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getClientDebtSummary } from '@/lib/debts';
import { formatUyu } from '@/lib/money';

const appointmentLabels: Record<string, string> = {
  PENDIENTE_AGENDAR: 'Pendiente de agendar',
  AGENDADA: 'Agendada',
  REAGENDADA: 'Reagendada',
  REALIZADA: 'Realizada',
  CANCELADA: 'Cancelada',
};

type Appointment = {
  id:string; client_id:string; client_name:string; technician_name:string|null;
  scheduled_at:string|null; status:string; notes:string|null;
};

export default async function AppointmentsPage() {
  const user = await requireUser();
  const clients = db.prepare("SELECT id,name FROM clients WHERE status='ACTIVO' ORDER BY name")
    .all() as { id:string; name:string }[];
  const technicians = db.prepare("SELECT id,name FROM users WHERE role='TECNICO' ORDER BY name")
    .all() as { id:string; name:string }[];
  const orders = (user.role === 'ADMIN'
    ? db.prepare(`SELECT w.id,w.client_id,w.description,c.name client_name
        FROM work_orders w JOIN clients c ON c.id=w.client_id
        WHERE w.status<>'TERMINADO' ORDER BY w.created_at DESC`).all()
    : db.prepare(`SELECT w.id,w.client_id,w.description,c.name client_name
        FROM work_orders w JOIN clients c ON c.id=w.client_id
        WHERE w.status<>'TERMINADO' AND w.assigned_technician_id=?
        ORDER BY w.created_at DESC`).all(user.id)) as
    { id:string; client_id:string; description:string; client_name:string }[];
  const appointments = (user.role === 'ADMIN'
    ? db.prepare(`SELECT a.*,c.name client_name,u.name technician_name
        FROM appointments a JOIN clients c ON c.id=a.client_id
        LEFT JOIN users u ON u.id=a.assigned_technician_id
        ORDER BY COALESCE(a.scheduled_at,a.created_at) DESC`).all()
    : db.prepare(`SELECT a.*,c.name client_name,u.name technician_name
        FROM appointments a JOIN clients c ON c.id=a.client_id
        LEFT JOIN users u ON u.id=a.assigned_technician_id
        WHERE a.assigned_technician_id=?
        ORDER BY COALESCE(a.scheduled_at,a.created_at) DESC`).all(user.id)) as Appointment[];

  return <AppShell><h1>Citas</h1><div className="grid"><section className="card"><h2>Nueva cita</h2>{clients.length===0?<p>Primero crea un cliente activo.</p>:<form action={createAppointment} className="form"><label>Cliente<select name="clientId" required>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Trabajo existente (opcional)<select name="workOrderId"><option value="">Iniciará un trabajo nuevo</option>{orders.map(o=><option key={o.id} value={o.id}>{o.client_name}: {o.description}</option>)}</select></label>{user.role==='ADMIN'&&<label>Técnico<select name="technicianId"><option value="">Pendiente de asignar</option>{technicians.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}<label>Fecha y hora<input name="scheduledAt" type="datetime-local"/></label><label>Notas<textarea name="notes"/></label><button>Guardar cita</button></form>}</section><section className="card"><h2>Agenda</h2>{appointments.length===0?<p className="muted">No hay citas registradas.</p>:<div className="records">{appointments.map(a=>{const debt=getClientDebtSummary(db,a.client_id);return <article className="record" key={a.id}><div><span className="badge">{appointmentLabels[a.status]}</span><h3><Link href={`/citas/${a.id}`}>{a.client_name}</Link></h3><p>{a.scheduled_at?new Date(a.scheduled_at).toLocaleString('es-UY'):'Sin fecha'} · {a.technician_name??'Sin asignar'}</p>{debt.completedDebtCents>0&&<p className="danger">Deuda previa: {formatUyu(debt.completedDebtCents)} en {debt.completedDebtCount} trabajos.</p>}</div></article>})}</div>}</section></div></AppShell>;
}
