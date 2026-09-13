import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { formatUyu } from '@/lib/money';
import { statusDisplay, type WorkOrderStatus } from '@/lib/work-order-display';

const statuses: WorkOrderStatus[] = ['PENDIENTE', 'EN_PROCESO', 'TERMINADO'];

export default async function Dashboard() {
  const user = await requireUser();
  const workFilter = user.role === 'ADMIN' ? '' : ' WHERE assigned_technician_id=?';
  const params = user.role === 'ADMIN' ? [] : [user.id];
  const counts = db.prepare(`SELECT status,COUNT(*) count FROM work_orders${workFilter} GROUP BY status`)
    .all(...params) as { status: WorkOrderStatus; count: number }[];
  const appointmentFilter = user.role === 'ADMIN' ? '' : ' AND assigned_technician_id=?';
  const openAppointments = (db.prepare(`SELECT COUNT(*) count FROM appointments
    WHERE status IN ('PENDIENTE_AGENDAR','AGENDADA','REAGENDADA')${appointmentFilter}`)
    .get(...params) as { count: number }).count;
  const clientCount = user.role === 'ADMIN'
    ? (db.prepare("SELECT COUNT(*) count FROM clients WHERE status='ACTIVO'").get() as { count: number }).count
    : null;
  const debt = user.role === 'ADMIN' ? (db.prepare(`SELECT COALESCE(SUM(
    CASE WHEN COALESCE(w.total_cents,0)-COALESCE((SELECT SUM(p.amount_cents)
      FROM payments p WHERE p.work_order_id=w.id),0)>0
    THEN COALESCE(w.total_cents,0)-COALESCE((SELECT SUM(p.amount_cents)
      FROM payments p WHERE p.work_order_id=w.id),0) ELSE 0 END),0) amount
    FROM work_orders w`).get() as { amount: number }).amount : null;

  return <AppShell>
    <header className="dashboard-heading">
      <div><p className="eyebrow">{user.role === 'ADMIN' ? 'Mesa de operaciones' : 'Ruta asignada'}</p><h1>Buen trabajo, {user.name.split(' ')[0]}</h1><p className="lead">{user.role === 'ADMIN' ? 'Una lectura rápida del servicio, la agenda y los cobros.' : 'Tus trabajos, visitas y datos de clientes en un solo lugar.'}</p></div>
      <div className="quick-actions"><Link className="button" href="/citas">Nueva cita</Link><Link className="button button-secondary" href="/partes">Abrir trabajos</Link></div>
    </header>
    <section className="dashboard-grid" aria-label="Resumen de trabajos">
      {statuses.map((status, index) => {
        const display = statusDisplay(status);
        return <Link href="/partes" className={`metric-card metric-${display.tone}`} key={status}>
          <span className="metric-index">0{index + 1}</span><span className={`badge badge-${display.tone}`}>{display.label}</span>
          <strong className="metric-value">{counts.find((item) => item.status === status)?.count ?? 0}</strong><span className="metric-label">trabajos</span>
        </Link>;
      })}
    </section>
    <section className="dashboard-strip">
      <article><span>Citas abiertas</span><strong>{openAppointments}</strong><Link href="/citas">Ver agenda →</Link></article>
      {user.role === 'ADMIN' && <><article><span>Clientes activos</span><strong>{clientCount}</strong><Link href="/clientes">Ver clientes →</Link></article><article className="debt-summary"><span>Saldo por cobrar</span><strong>{formatUyu(debt ?? 0)}</strong><Link href="/informes?view=deudas">Ver deudas →</Link></article></>}
      {user.role === 'TECNICO' && <article><span>Acceso de campo</span><strong>Visitas</strong><Link href="/partes">Registrar parte →</Link></article>}
    </section>
  </AppShell>;
}
