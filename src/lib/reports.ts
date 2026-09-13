import type Database from 'better-sqlite3';

export type ReportFilters = {
  from?: string;
  to?: string;
  clientId?: string;
  technicianId?: string;
  status?: string;
  materialId?: string;
  supplierId?: string;
};

export type WorkReportRow = {
  workOrderId: string;
  clientId: string;
  clientName: string;
  technicianId: string;
  technicianName: string;
  type: string;
  description: string;
  status: string;
  collectionMode: string | null;
  plannedInstallments: number | null;
  createdAt: string;
  totalCents: number;
  paidCents: number;
  debtCents: number;
  visitCount: number;
};

function workRows(database: Database.Database, filters: ReportFilters) {
  const clauses = ['1=1'];
  const params: string[] = [];
  if (filters.from) {
    clauses.push('date(w.created_at)>=date(?)');
    params.push(filters.from);
  }
  if (filters.to) {
    clauses.push('date(w.created_at)<=date(?)');
    params.push(filters.to);
  }
  if (filters.clientId) {
    clauses.push('w.client_id=?');
    params.push(filters.clientId);
  }
  if (filters.technicianId) {
    clauses.push('w.assigned_technician_id=?');
    params.push(filters.technicianId);
  }
  if (filters.status) {
    clauses.push('w.status=?');
    params.push(filters.status);
  }

  const rows = database.prepare(`SELECT w.id workOrderId,c.id clientId,
    c.name clientName,u.id technicianId,u.name technicianName,w.type,
    w.description,w.status,w.collection_mode collectionMode,
    w.planned_installments plannedInstallments,w.created_at createdAt,
    COALESCE(w.total_cents,0) totalCents,
    COALESCE((SELECT SUM(p.amount_cents) FROM payments p
      WHERE p.work_order_id=w.id),0) paidCents,
    (SELECT COUNT(*) FROM visits v WHERE v.work_order_id=w.id) visitCount
    FROM work_orders w JOIN clients c ON c.id=w.client_id
    JOIN users u ON u.id=w.assigned_technician_id
    WHERE ${clauses.join(' AND ')}
    ORDER BY c.name,w.created_at DESC`).all(...params) as Omit<WorkReportRow, 'debtCents'>[];

  return rows.map((row) => ({
    ...row,
    debtCents: row.totalCents - row.paidCents,
  }));
}

function groupByClient(rows: WorkReportRow[]) {
  const grouped = new Map<string, WorkReportRow[]>();
  for (const row of rows) {
    grouped.set(row.clientId, [...(grouped.get(row.clientId) ?? []), row]);
  }
  return [...grouped.values()].map((clientRows) => ({
    clientId: clientRows[0].clientId,
    clientName: clientRows[0].clientName,
    rows: clientRows,
    subtotalBilledCents: clientRows.reduce((sum, row) => sum + row.totalCents, 0),
    subtotalCollectedCents: clientRows.reduce((sum, row) => sum + row.paidCents, 0),
    subtotalDebtCents: clientRows.reduce((sum, row) => sum + row.debtCents, 0),
  }));
}

export function clientWorkReport(database: Database.Database, filters: ReportFilters) {
  const rows = workRows(database, filters);
  const groups = groupByClient(rows);
  return {
    groups,
    totalBilledCents: groups.reduce((sum, group) => sum + group.subtotalBilledCents, 0),
    totalCollectedCents: groups.reduce((sum, group) => sum + group.subtotalCollectedCents, 0),
  };
}

export function clientDebtReport(database: Database.Database, filters: ReportFilters) {
  const rows = workRows(database, filters).filter(
    (row) => row.totalCents > 0 && row.debtCents > 0,
  );
  const groups = groupByClient(rows);
  return {
    groups,
    totalDebtCents: groups.reduce((sum, group) => sum + group.subtotalDebtCents, 0),
  };
}

export function technicianWorkReport(database: Database.Database, filters: ReportFilters) {
  const rows = workRows(database, filters);
  const grouped = new Map<string, WorkReportRow[]>();
  for (const row of rows) {
    grouped.set(row.technicianId, [...(grouped.get(row.technicianId) ?? []), row]);
  }
  const groups = [...grouped.values()].map((technicianRows) => ({
    technicianId: technicianRows[0].technicianId,
    technicianName: technicianRows[0].technicianName,
    rows: technicianRows,
    subtotalBilledCents: technicianRows.reduce((sum, row) => sum + row.totalCents, 0),
    subtotalCollectedCents: technicianRows.reduce((sum, row) => sum + row.paidCents, 0),
    subtotalDebtCents: technicianRows.reduce((sum, row) => sum + row.debtCents, 0),
  }));
  return {
    groups,
    totalBilledCents: groups.reduce((sum, group) => sum + group.subtotalBilledCents, 0),
    totalCollectedCents: groups.reduce((sum, group) => sum + group.subtotalCollectedCents, 0),
    totalDebtCents: groups.reduce((sum, group) => sum + group.subtotalDebtCents, 0),
  };
}

export type MaterialUsageReportRow = {
  materialId: string;
  materialName: string;
  model: string;
  supplierName: string;
  technicianId: string;
  technicianName: string;
  totalQuantity: number;
  totalCostCents: number;
};

export function materialUsageReport(database: Database.Database, filters: ReportFilters) {
  const clauses = ['1=1'];
  const params: string[] = [];
  if (filters.from) {
    clauses.push('date(v.visit_date)>=date(?)');
    params.push(filters.from);
  }
  if (filters.to) {
    clauses.push('date(v.visit_date)<=date(?)');
    params.push(filters.to);
  }
  if (filters.technicianId) {
    clauses.push('mu.technician_id=?');
    params.push(filters.technicianId);
  }
  if (filters.materialId) {
    clauses.push('mu.material_id=?');
    params.push(filters.materialId);
  }
  if (filters.supplierId) {
    clauses.push('m.supplier_id=?');
    params.push(filters.supplierId);
  }
  const rows = database.prepare(`SELECT m.id materialId,m.name materialName,
    m.model,s.name supplierName,u.id technicianId,u.name technicianName,
    SUM(mu.quantity) totalQuantity,
    SUM(mu.quantity*mu.unit_cost_cents_snapshot) totalCostCents
    FROM material_usages mu JOIN materials m ON m.id=mu.material_id
    JOIN suppliers s ON s.id=m.supplier_id JOIN users u ON u.id=mu.technician_id
    JOIN visits v ON v.id=mu.visit_id WHERE ${clauses.join(' AND ')}
    GROUP BY m.id,u.id ORDER BY m.name,u.name`).all(...params) as MaterialUsageReportRow[];
  return {
    rows,
    totalQuantity: rows.reduce((sum, row) => sum + row.totalQuantity, 0),
    totalCostCents: rows.reduce((sum, row) => sum + row.totalCostCents, 0),
  };
}

export function catalogReport(database: Database.Database, filters: ReportFilters) {
  const clauses = ['1=1'];
  const params: string[] = [];
  if (filters.materialId) {
    clauses.push('m.id=?');
    params.push(filters.materialId);
  }
  if (filters.supplierId) {
    clauses.push('s.id=?');
    params.push(filters.supplierId);
  }
  if (filters.status) {
    clauses.push('m.status=?');
    params.push(filters.status);
  }
  return database.prepare(`SELECT m.id materialId,m.name materialName,m.model,
    m.cost_cents costCents,m.status materialStatus,s.id supplierId,
    s.name supplierName,s.status supplierStatus
    FROM materials m JOIN suppliers s ON s.id=m.supplier_id
    WHERE ${clauses.join(' AND ')} ORDER BY s.name,m.name,m.model`).all(...params) as
    {materialId:string;materialName:string;model:string;costCents:number;materialStatus:string;supplierId:string;supplierName:string;supplierStatus:string}[];
}
