import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatUyu } from '@/lib/money';
import {
  catalogReport,
  clientDebtReport,
  clientWorkReport,
  materialUsageReport,
  technicianWorkReport,
  type ReportFilters,
  type WorkReportRow,
} from '@/lib/reports';
import { statusDisplay, workOrderTypeLabel, type WorkOrderStatus } from '@/lib/work-order-display';

type View = 'clientes' | 'deudas' | 'tecnicos' | 'usos' | 'catalogo';
type Search = ReportFilters & { view?: View };

const viewNames: Record<View, string> = {
  clientes: 'Trabajos por cliente',
  deudas: 'Deudas y financiación',
  tecnicos: 'Trabajos por técnico',
  usos: 'Uso de materiales',
  catalogo: 'Materiales y proveedores',
};

function WorkRows({ rows }: { rows: WorkReportRow[] }) {
  return <div className="table-wrap"><table className="table"><thead><tr>
    <th>Trabajo</th><th>Estado</th><th>Visitas</th><th>Facturado</th><th>Cobrado</th><th>Saldo</th>
  </tr></thead><tbody>{rows.map((row) => {
    const display = statusDisplay(row.status as WorkOrderStatus);
    return <tr key={row.workOrderId}>
      <td><Link href={`/partes/${row.workOrderId}`}>{workOrderTypeLabel(row.type)}</Link><br /><span className="muted">{row.description}</span></td>
      <td><span className={`badge badge-${display.tone}`}>{display.label}</span></td>
      <td>{row.visitCount}</td><td>{formatUyu(row.totalCents)}</td><td>{formatUyu(row.paidCents)}</td><td>{formatUyu(Math.max(0, row.debtCents))}</td>
    </tr>;
  })}</tbody></table></div>;
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  if (user.role !== 'ADMIN') notFound();
  const query = await searchParams;
  const view: View = query.view && query.view in viewNames ? query.view : 'clientes';
  const filters: ReportFilters = {
    from: query.from,
    to: query.to,
    clientId: query.clientId,
    technicianId: query.technicianId,
    status: query.status,
    materialId: query.materialId,
    supplierId: query.supplierId,
  };
  const clients = db.prepare('SELECT id,name FROM clients ORDER BY name').all() as { id: string; name: string }[];
  const technicians = db.prepare("SELECT id,name FROM users WHERE role='TECNICO' ORDER BY name").all() as { id: string; name: string }[];
  const materials = db.prepare('SELECT id,name,model FROM materials ORDER BY name,model').all() as { id: string; name: string; model: string }[];
  const suppliers = db.prepare('SELECT id,name FROM suppliers ORDER BY name').all() as { id: string; name: string }[];
  const isWorkView = view === 'clientes' || view === 'deudas' || view === 'tecnicos';

  return <AppShell>
    <header className="page-heading"><div><p className="eyebrow">Control operativo</p><h1>Informes</h1><p className="muted">Consulta en pantalla con filtros, parciales y totales.</p></div></header>
    <nav className="report-tabs" aria-label="Tipos de informe">
      {(Object.entries(viewNames) as [View, string][]).map(([key, label]) =>
        <Link key={key} href={`/informes?view=${key}`} aria-current={view === key ? 'page' : undefined}>{label}</Link>)}
    </nav>
    <section className="card report-filter">
      <form className="filter-grid">
        <input type="hidden" name="view" value={view} />
        {view !== 'catalogo' && <><label>Desde<input type="date" name="from" defaultValue={query.from} /></label><label>Hasta<input type="date" name="to" defaultValue={query.to} /></label></>}
        {(view === 'clientes' || view === 'deudas') && <label>Cliente<select name="clientId" defaultValue={query.clientId ?? ''}><option value="">Todos</option>{clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
        {(view === 'tecnicos' || view === 'usos') && <label>Técnico<select name="technicianId" defaultValue={query.technicianId ?? ''}><option value="">Todos</option>{technicians.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
        {(view === 'usos' || view === 'catalogo') && <label>Material<select name="materialId" defaultValue={query.materialId ?? ''}><option value="">Todos</option>{materials.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.model}</option>)}</select></label>}
        {(view === 'usos' || view === 'catalogo') && <label>Proveedor<select name="supplierId" defaultValue={query.supplierId ?? ''}><option value="">Todos</option>{suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
        {isWorkView && <label>Estado<select name="status" defaultValue={query.status ?? ''}><option value="">Todos</option><option value="PENDIENTE">Pendiente</option><option value="EN_PROCESO">En proceso</option><option value="TERMINADO">Terminado</option></select></label>}
        {view === 'catalogo' && <label>Estado<select name="status" defaultValue={query.status ?? ''}><option value="">Todos</option><option value="ACTIVO">Activo</option><option value="ARCHIVADO">Archivado</option></select></label>}
        <div className="filter-actions"><button>Aplicar filtros</button><Link className="button button-secondary" href={`/informes?view=${view}`}>Limpiar</Link></div>
      </form>
    </section>
    <h2>{viewNames[view]}</h2>
    {view === 'clientes' && (() => {
      const report = clientWorkReport(db, filters);
      return <>{report.groups.map((group) => <section className="card report-group" key={group.clientId}><h3>{group.clientName}</h3><WorkRows rows={group.rows} /><footer className="report-subtotal"><span>Subtotal facturado <strong>{formatUyu(group.subtotalBilledCents)}</strong></span><span>Cobrado <strong>{formatUyu(group.subtotalCollectedCents)}</strong></span><span>Saldo <strong>{formatUyu(group.subtotalDebtCents)}</strong></span></footer></section>)}<div className="report-total"><span>Total facturado</span><strong>{formatUyu(report.totalBilledCents)}</strong><span>Total cobrado</span><strong>{formatUyu(report.totalCollectedCents)}</strong></div></>;
    })()}
    {view === 'deudas' && (() => {
      const report = clientDebtReport(db, filters);
      return <>{report.groups.length === 0 && <p className="empty-state">No hay deudas para los filtros seleccionados.</p>}{report.groups.map((group) => <section className="card report-group" key={group.clientId}><h3>{group.clientName}</h3><WorkRows rows={group.rows} /><footer className="report-subtotal"><span>Deuda del cliente <strong>{formatUyu(group.subtotalDebtCents)}</strong></span></footer></section>)}<div className="report-total"><span>Deuda total</span><strong>{formatUyu(report.totalDebtCents)}</strong></div></>;
    })()}
    {view === 'tecnicos' && (() => {
      const report = technicianWorkReport(db, filters);
      return <>{report.groups.map((group) => <section className="card report-group" key={group.technicianId}><h3>{group.technicianName}</h3><WorkRows rows={group.rows} /><footer className="report-subtotal"><span>Facturado <strong>{formatUyu(group.subtotalBilledCents)}</strong></span><span>Cobrado <strong>{formatUyu(group.subtotalCollectedCents)}</strong></span><span>Saldo <strong>{formatUyu(group.subtotalDebtCents)}</strong></span></footer></section>)}<div className="report-total"><span>Total facturado</span><strong>{formatUyu(report.totalBilledCents)}</strong><span>Total cobrado</span><strong>{formatUyu(report.totalCollectedCents)}</strong><span>Saldo total</span><strong>{formatUyu(report.totalDebtCents)}</strong></div></>;
    })()}
    {view === 'usos' && (() => {
      const report = materialUsageReport(db, filters);
      return <><section className="card"><div className="table-wrap"><table className="table"><thead><tr><th>Material</th><th>Proveedor</th><th>Técnico</th><th>Cantidad</th><th>Coste histórico</th></tr></thead><tbody>{report.rows.map((row) => <tr key={`${row.materialId}-${row.technicianId}`}><td>{row.materialName}<br /><span className="muted">{row.model}</span></td><td>{row.supplierName}</td><td>{row.technicianName}</td><td>{row.totalQuantity}</td><td>{formatUyu(row.totalCostCents)}</td></tr>)}</tbody></table></div></section><div className="report-total"><span>Unidades registradas</span><strong>{report.totalQuantity}</strong><span>Coste histórico total</span><strong>{formatUyu(report.totalCostCents)}</strong></div></>;
    })()}
    {view === 'catalogo' && (() => {
      const rows = catalogReport(db, filters);
      return <section className="card"><div className="table-wrap"><table className="table"><thead><tr><th>Proveedor</th><th>Material</th><th>Modelo</th><th>Coste</th><th>Estado</th></tr></thead><tbody>{rows.map((row) => <tr key={row.materialId}><td>{row.supplierName}<br /><span className="muted">{row.supplierStatus}</span></td><td>{row.materialName}</td><td>{row.model}</td><td>{formatUyu(row.costCents)}</td><td><span className="badge">{row.materialStatus}</span></td></tr>)}</tbody></table></div></section>;
    })()}
  </AppShell>;
}
