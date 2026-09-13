import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import {
  cancelAppointment,
  rescheduleAppointment,
  updateAppointment,
} from '@/app/actions/appointments';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getClientDebtSummary } from '@/lib/debts';
import { formatUyu } from '@/lib/money';

const labels: Record<string,string> = {
  PENDIENTE_AGENDAR:'Pendiente de agendar', AGENDADA:'Agendada',
  REAGENDADA:'Reagendada', REALIZADA:'Realizada', CANCELADA:'Cancelada',
};

type Appointment = {
  id:string; client_id:string; client_name:string; assigned_technician_id:string|null;
  technician_name:string|null; work_order_id:string|null; scheduled_at:string|null;
  status:string; notes:string|null; cancellation_reason:string|null;
};

export default async function AppointmentDetail({params}:{params:Promise<{id:string}>}) {
  const {id}=await params; const user=await requireUser();
  const appointment=db.prepare(`SELECT a.*,c.name client_name,u.name technician_name
    FROM appointments a JOIN clients c ON c.id=a.client_id
    LEFT JOIN users u ON u.id=a.assigned_technician_id WHERE a.id=?`).get(id) as Appointment|undefined;
  if(!appointment) notFound();
  if(user.role!=='ADMIN'&&appointment.assigned_technician_id!==user.id) notFound();
  const technicians=db.prepare("SELECT id,name FROM users WHERE role='TECNICO' ORDER BY name").all() as {id:string;name:string}[];
  const debt=getClientDebtSummary(db,appointment.client_id);

  return <AppShell><p><Link href="/citas">Volver a citas</Link></p><h1>{appointment.client_name}</h1><p><span className="badge">{labels[appointment.status]}</span> · {appointment.scheduled_at?new Date(appointment.scheduled_at).toLocaleString('es-UY'):'Sin fecha'} · {appointment.technician_name??'Sin asignar'}</p>{debt.completedDebtCents>0&&<aside className="card danger"><strong>Cliente con deuda previa</strong><p>{formatUyu(debt.completedDebtCents)} pendientes en {debt.completedDebtCount} trabajos terminados.</p><Link href={`/clientes/${appointment.client_id}`}>Consultar historial completo</Link></aside>}<div className="grid"><section className="card"><h2>Notas</h2><form action={updateAppointment.bind(null,id)} className="form"><label>Detalle<textarea name="notes" defaultValue={appointment.notes??''}/></label><button>Guardar notas</button></form>{appointment.work_order_id&&<p><Link href={`/partes/${appointment.work_order_id}`}>Abrir trabajo relacionado</Link></p>}</section><section className="card"><h2>Reagendar</h2><form action={rescheduleAppointment.bind(null,id)} className="form">{user.role==='ADMIN'&&<label>Técnico<select name="technicianId" defaultValue={appointment.assigned_technician_id??''}><option value="">Seleccionar</option>{technicians.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}<label>Nueva fecha y hora<input name="scheduledAt" type="datetime-local" required/></label><button>Reagendar cita</button></form></section><section className="card"><h2>Cancelar</h2><form action={cancelAppointment.bind(null,id)} className="form"><label>Motivo<textarea name="reason" required/></label><button>Cancelar cita</button></form>{appointment.cancellation_reason&&<p className="danger">Motivo actual: {appointment.cancellation_reason}</p>}</section></div></AppShell>;
}
