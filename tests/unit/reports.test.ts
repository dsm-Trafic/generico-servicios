import Database from 'better-sqlite3';
import { beforeEach, expect, it } from 'vitest';
import { initializeSchema } from '@/lib/schema';
import {
  clientDebtReport,
  materialUsageReport,
  technicianWorkReport,
} from '@/lib/reports';

let database: Database.Database;

beforeEach(() => {
  database = new Database(':memory:');
  initializeSchema(database);
  database.exec(`
    INSERT INTO users (id,name,email,password_hash,role) VALUES
      ('admin','Oficina','a@local','x','ADMIN'),
      ('t1','Técnico 1','t1@local','x','TECNICO');
    INSERT INTO clients (id,name,phone) VALUES ('c1','Cliente Norte','099');
    INSERT INTO suppliers (id,name) VALUES ('s1','Proveedor Uno');
    INSERT INTO materials (id,name,model,supplier_id,cost_cents)
      VALUES ('m1','Cable','2 mm','s1',1000);
    INSERT INTO work_orders
      (id,client_id,assigned_technician_id,created_by_id,type,description,status,total_cents,collection_mode,created_at)
      VALUES ('w1','c1','t1','admin','TRABAJO_GENERAL','Instalación','TERMINADO',100000,'FINANCIADO','2026-09-10');
    INSERT INTO visits
      (id,work_order_id,technician_id,visit_date,started_at,ended_at,notes,resulting_status,created_by_id)
      VALUES ('v1','w1','t1','2026-09-11','2026-09-11T10:00','2026-09-11T11:00','Instalado','TERMINADO','t1');
    INSERT INTO payments (id,work_order_id,visit_id,received_by_id,amount_cents,method)
      VALUES ('p1','w1','v1','t1',30000,'EFECTIVO');
    INSERT INTO material_usages
      (id,visit_id,material_id,technician_id,quantity,unit_cost_cents_snapshot)
      VALUES ('mu1','v1','m1','t1',3,1000);
  `);
});

it('calcula deuda por cliente con subtotal y total general', () => {
  const report = clientDebtReport(database, {});
  expect(report.groups[0].subtotalDebtCents).toBe(70_000);
  expect(report.totalDebtCents).toBe(70_000);
});

it('agrupa trabajos por técnico con importes parciales', () => {
  const report = technicianWorkReport(database, {});
  expect(report.groups[0]).toMatchObject({
    technicianName: 'Técnico 1',
    subtotalBilledCents: 100_000,
    subtotalCollectedCents: 30_000,
  });
});

it('agrupa materiales por técnico y conserva el coste histórico', () => {
  const report = materialUsageReport(database, {});
  expect(report.rows[0]).toMatchObject({
    materialName: 'Cable',
    technicianName: 'Técnico 1',
    totalQuantity: 3,
    totalCostCents: 3_000,
  });
});
