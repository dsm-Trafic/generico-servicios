import type Database from 'better-sqlite3';

export type DebtSource = {
  status: string;
  totalCents: number | null;
  paidCents: number;
};

export function clientDebtSummary(rows: DebtSource[]) {
  const completed = rows.filter(
    (row) =>
      row.status === 'TERMINADO' &&
      row.totalCents !== null &&
      row.totalCents > row.paidCents,
  );

  return {
    completedDebtCents: completed.reduce(
      (sum, row) => sum + (row.totalCents ?? 0) - row.paidCents,
      0,
    ),
    completedDebtCount: completed.length,
  };
}

export function getClientDebtSummary(
  database: Database.Database,
  clientId: string,
) {
  const rows = database.prepare(`SELECT w.status,w.total_cents totalCents,
    COALESCE(SUM(p.amount_cents),0) paidCents
    FROM work_orders w LEFT JOIN payments p ON p.work_order_id=w.id
    WHERE w.client_id=? GROUP BY w.id`).all(clientId) as DebtSource[];
  return clientDebtSummary(rows);
}
