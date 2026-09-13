# Jobs, Visits, Collections, and Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-part prototype with a local operational system for clients, appointments, multi-visit jobs, flexible collections, materials, suppliers, debts, and filtered reports.

**Architecture:** SQLite remains the source of truth, but schema creation moves to a testable module and the disposable local database is reset. Server Actions are separated by domain, pure policy helpers enforce permissions and balances, and report queries return grouped totals. Existing pages are expanded with appointments, catalogs, reports, and the approved technical-workbook visual system.

**Tech Stack:** Next.js 16 App Router, React 19 server components, TypeScript 5.9, `better-sqlite3`, Vitest, CSS.

## Global Constraints

- Reset `data/generico-servicios.db`; current records are test data and do not need migration.
- Job types are `TRABAJO_GENERAL`, `URGENCIA`, `MANTENIMIENTO`, and `SOLICITUD_PRESUPUESTO`.
- Only real payments reduce debt; financing terms never count as collected money.
- Lock total cost and assigned technician after the first completed visit.
- Office never records collections; the assigned technician records them during visits.
- Materials come from an Office-managed dropdown and retain cost snapshots in usage history.
- Clients and appointments are never hard-deleted. Used materials and related suppliers are archived instead of deleted.
- Technicians remain fixed seeded accounts in this stage.
- Reports are filtered on screen only; do not add PDF, spreadsheet, print, CRM, or warehouse stock features.
- Keep `AGENTS.md` and `CLAUDE.md` identical and document architecture and current state changes.

---

### Task 1: Create and verify the version-two database schema

**Files:**
- Create: `src/lib/schema.ts`
- Modify: `src/lib/db.ts`
- Modify: `scripts/reset-db.ts`
- Create: `tests/unit/schema.test.ts`

**Interfaces:**
- Produces: `initializeSchema(database: Database.Database): void`.
- Consumes: an open `better-sqlite3` connection.
- Produces tables: `users`, `clients`, `suppliers`, `materials`, `work_orders`, `appointments`, `visits`, `material_usages`, `payments`, `budgets`, and `budget_lines`.

- [x] **Step 1: Write a failing in-memory schema test**

```ts
import Database from 'better-sqlite3';
import { expect, it } from 'vitest';
import { initializeSchema } from '@/lib/schema';

it('creates every operational table', () => {
  const database = new Database(':memory:');
  initializeSchema(database);
  const names = database.prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all().map((row) => (row as { name: string }).name);
  expect(names).toEqual(expect.arrayContaining([
    'clients', 'suppliers', 'materials', 'work_orders', 'appointments',
    'visits', 'material_usages', 'payments',
  ]));
});
```

- [x] **Step 2: Verify the schema test fails**

Run: `npx vitest run tests/unit/schema.test.ts`  
Expected: FAIL because `src/lib/schema.ts` does not exist.

- [x] **Step 3: Implement the normalized schema**

Use nullable `total_cents`, `collection_mode`, and `planned_installments` on
`work_orders` until the first visit is completed. Add checks for the approved
enum values. Store `scheduled_at` and `status` on appointments; `started_at`,
`ended_at`, `notes`, and `resulting_status` on visits; and
`unit_cost_cents_snapshot` on material usages. Payments contain only received
amount, method, visit, job, technician, and timestamp.

```ts
export function initializeSchema(database: Database.Database) {
  database.pragma('foreign_keys = ON');
  database.pragma('journal_mode = WAL');
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('ADMIN','TECNICO'))
    );
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL,
      email TEXT, address TEXT, status TEXT NOT NULL DEFAULT 'ACTIVO'
        CHECK(status IN ('ACTIVO','ARCHIVADO')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, email TEXT, notes TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVO' CHECK(status IN ('ACTIVO','ARCHIVADO'))
    );
    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, model TEXT NOT NULL,
      supplier_id TEXT NOT NULL REFERENCES suppliers(id), cost_cents INTEGER NOT NULL CHECK(cost_cents>=0),
      status TEXT NOT NULL DEFAULT 'ACTIVO' CHECK(status IN ('ACTIVO','ARCHIVADO'))
    );
    CREATE TABLE IF NOT EXISTS work_orders (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL REFERENCES clients(id),
      assigned_technician_id TEXT NOT NULL REFERENCES users(id), created_by_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL CHECK(type IN ('TRABAJO_GENERAL','URGENCIA','MANTENIMIENTO','SOLICITUD_PRESUPUESTO')),
      description TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'PENDIENTE'
        CHECK(status IN ('PENDIENTE','EN_PROCESO','TERMINADO')),
      total_cents INTEGER CHECK(total_cents>0), collection_mode TEXT
        CHECK(collection_mode IN ('CONTADO','FINANCIADO','DEUDA_ABIERTA')),
      planned_installments INTEGER CHECK(planned_installments>0),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, closed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL REFERENCES clients(id),
      work_order_id TEXT REFERENCES work_orders(id), assigned_technician_id TEXT REFERENCES users(id),
      scheduled_at TEXT, status TEXT NOT NULL CHECK(status IN
        ('PENDIENTE_AGENDAR','AGENDADA','REAGENDADA','REALIZADA','CANCELADA')),
      notes TEXT, cancellation_reason TEXT, created_by_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY, work_order_id TEXT NOT NULL REFERENCES work_orders(id),
      appointment_id TEXT UNIQUE REFERENCES appointments(id), technician_id TEXT NOT NULL REFERENCES users(id),
      visit_date TEXT NOT NULL, started_at TEXT, ended_at TEXT, notes TEXT,
      resulting_status TEXT CHECK(resulting_status IN ('EN_PROCESO','TERMINADO')),
      created_by_id TEXT NOT NULL REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS material_usages (
      id TEXT PRIMARY KEY, visit_id TEXT NOT NULL REFERENCES visits(id),
      material_id TEXT NOT NULL REFERENCES materials(id), technician_id TEXT NOT NULL REFERENCES users(id),
      quantity INTEGER NOT NULL CHECK(quantity>0), unit_cost_cents_snapshot INTEGER NOT NULL CHECK(unit_cost_cents_snapshot>=0)
    );
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY, work_order_id TEXT NOT NULL REFERENCES work_orders(id),
      visit_id TEXT NOT NULL REFERENCES visits(id), received_by_id TEXT NOT NULL REFERENCES users(id),
      amount_cents INTEGER NOT NULL CHECK(amount_cents>0), method TEXT NOT NULL
        CHECK(method IN ('EFECTIVO','TRANSFERENCIA','MERCADO_PAGO')),
      received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY, work_order_id TEXT NOT NULL REFERENCES work_orders(id),
      status TEXT NOT NULL DEFAULT 'BORRADOR', total_cents INTEGER NOT NULL CHECK(total_cents>=0)
    );
    CREATE TABLE IF NOT EXISTS budget_lines (
      id TEXT PRIMARY KEY, budget_id TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
      concept TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity>0),
      unit_price_cents INTEGER NOT NULL CHECK(unit_price_cents>=0)
    );
  `);
}
```

- [x] **Step 4: Connect runtime initialization and reset behaviour**

```ts
// src/lib/db.ts
export const db = new Database(databasePath);
initializeSchema(db);
ensureSeedData();
```

Make `scripts/reset-db.ts` close its connection, remove only the resolved file
inside `data/`, reopen through `src/lib/db.ts`, and print the final path.

- [x] **Step 5: Verify and commit the schema**

Run: `npx vitest run tests/unit/schema.test.ts`  
Expected: PASS.

```bash
git add src/lib/schema.ts src/lib/db.ts scripts/reset-db.ts tests/unit/schema.test.ts
git commit -m "feat: add jobs and visits schema"
```

### Task 2: Implement domain rules for assignments, visits, and debt

**Files:**
- Modify: `src/lib/rules.ts`
- Modify: `tests/unit/rules.test.ts`
- Create: `src/lib/work-order-display.ts`
- Create: `tests/unit/work-order-display.test.ts`

**Interfaces:**
- Produces: `assertCanManageVisit`, `assertCanRecordPayment`, `assertWorkOrderTerms`, `remainingBalance`, and `statusDisplay`.

- [x] **Step 1: Add failing policy tests**

```ts
it('allows only the assigned technician to record a payment', () => {
  expect(() => assertCanRecordPayment('ADMIN', 'admin', 'tech-1')).toThrow('TECHNICIAN_REQUIRED');
  expect(() => assertCanRecordPayment('TECNICO', 'tech-2', 'tech-1')).toThrow('FORBIDDEN');
  expect(() => assertCanRecordPayment('TECNICO', 'tech-1', 'tech-1')).not.toThrow();
});

it('keeps financing separate from collected money', () => {
  expect(remainingBalance(120_000, [20_000, 25_000])).toBe(75_000);
});

it('requires terms on the first completed visit', () => {
  expect(() => assertWorkOrderTerms(null, null)).toThrow('WORK_ORDER_TERMS_REQUIRED');
});
```

- [x] **Step 2: Verify the policy tests fail**

Run: `npx vitest run tests/unit/rules.test.ts`  
Expected: FAIL for the new missing exports.

- [x] **Step 3: Implement minimal pure rules and status labels**

```ts
export function assertCanRecordPayment(role: 'ADMIN' | 'TECNICO', userId: string, technicianId: string) {
  if (role !== 'TECNICO') throw new Error('TECHNICIAN_REQUIRED');
  if (userId !== technicianId) throw new Error('FORBIDDEN');
}

export function assertWorkOrderTerms(totalCents: number | null, mode: string | null) {
  if (!totalCents || totalCents <= 0 || !mode) throw new Error('WORK_ORDER_TERMS_REQUIRED');
}
```

Map `PENDIENTE`, `EN_PROCESO`, and `TERMINADO` to readable labels and visual
tones `pending`, `active`, and `complete` in `work-order-display.ts`.

- [x] **Step 4: Verify and commit domain rules**

Run: `npx vitest run tests/unit/rules.test.ts tests/unit/work-order-display.test.ts`  
Expected: PASS.

```bash
git add src/lib/rules.ts src/lib/work-order-display.ts tests/unit
git commit -m "feat: enforce visit and collection rules"
```

### Task 3: Add client, supplier, and material management

**Files:**
- Create: `src/app/actions/form-data.ts`
- Create: `src/app/actions/auth.ts`
- Create: `src/app/actions/clients.ts`
- Create: `src/app/actions/catalog.ts`
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/clientes/page.tsx`
- Modify: `src/app/clientes/[id]/page.tsx`
- Create: `src/app/proveedores/page.tsx`
- Create: `src/app/materiales/page.tsx`
- Modify: `src/components/app-shell.tsx`

**Interfaces:**
- Produces: `requiredText(data, key)` and `optionalText(data, key)` form helpers.
- Produces Server Actions: `createClient`, `updateClient`, `archiveClient`, `createSupplier`, `updateSupplier`, `deleteOrArchiveSupplier`, `createMaterial`, `updateMaterial`, and `deleteOrArchiveMaterial`.

- [x] **Step 1: Implement client actions with role checks**

```ts
// src/app/actions/form-data.ts
export const optionalText = (data: FormData, key: string) => String(data.get(key) ?? '').trim() || null;
export function requiredText(data: FormData, key: string) {
  const value = optionalText(data, key);
  if (!value) throw new Error('REQUIRED_FIELD');
  return value;
}
```

```ts
export async function updateClient(clientId: string, data: FormData) {
  await requireUser();
  const name = requiredText(data, 'name');
  const phone = requiredText(data, 'phone');
  db.prepare(`UPDATE clients SET name=?, phone=?, email=?, address=?,
    updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(name, phone, optionalText(data, 'email'), optionalText(data, 'address'), clientId);
  revalidatePath(`/clientes/${clientId}`);
}
```

Allow both roles to create and edit. Require `ADMIN` for archive. Exclude archived
clients from new work and appointment selectors while retaining their history.

Move `loginAction` and `logoutAction` unchanged into `src/app/actions/auth.ts`,
then update the login page and `AppShell` imports before removing the legacy
action module in Task 5.

- [x] **Step 2: Implement catalog actions and historical deletion rules**

For a material, check `material_usages`; delete only when count is zero, otherwise
set `status='ARCHIVADO'`. For a supplier, check associated materials and apply
the same rule. Restrict every catalog mutation to `ADMIN`.

```ts
const usageCount = db.prepare('SELECT COUNT(*) count FROM material_usages WHERE material_id=?')
  .get(materialId) as { count: number };
if (usageCount.count === 0) db.prepare('DELETE FROM materials WHERE id=?').run(materialId);
else db.prepare("UPDATE materials SET status='ARCHIVADO' WHERE id=?").run(materialId);
```

- [x] **Step 3: Build client and catalog pages**

Create edit/archive controls on the client detail page, supplier fields `name`,
`phone`, `email`, `notes`, and material fields `name`, `model`, `supplierId`, and
`cost`. Use an active supplier dropdown and show archived rows separately.

```tsx
<form action={updateMaterial.bind(null, material.id)} className="form">
  <input name="name" defaultValue={material.name} required />
  <input name="model" defaultValue={material.model} required />
  <select name="supplierId" defaultValue={material.supplier_id} required>
    {activeSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
  </select>
  <input name="cost" defaultValue={String(material.cost_cents / 100)} required />
  <button>Guardar material</button>
</form>
```

- [x] **Step 4: Verify and commit master-data management**

Run: `npm run lint; npm run build`  
Expected: both exit `0`.

```bash
git add src/app/actions src/app/clientes src/app/proveedores src/app/materiales src/components/app-shell.tsx
git commit -m "feat: add client and material management"
```

### Task 4: Implement appointments and prior-debt alerts

**Files:**
- Create: `src/app/actions/appointments.ts`
- Create: `src/app/citas/page.tsx`
- Create: `src/app/citas/[id]/page.tsx`
- Create: `src/lib/debts.ts`
- Create: `tests/unit/debts.test.ts`
- Modify: `src/components/app-shell.tsx`

**Interfaces:**
- Produces: `createAppointment`, `updateAppointment`, `rescheduleAppointment`, `cancelAppointment`, and `clientDebtSummary`.
- Appointment statuses: `PENDIENTE_AGENDAR`, `AGENDADA`, `REAGENDADA`, `REALIZADA`, `CANCELADA`.

- [x] **Step 1: Test debt aggregation**

```ts
it('reports debt only from completed work with unpaid balance', () => {
  expect(clientDebtSummary([
    { status: 'TERMINADO', totalCents: 100_000, paidCents: 30_000 },
    { status: 'EN_PROCESO', totalCents: 50_000, paidCents: 0 },
  ])).toEqual({ completedDebtCents: 70_000, completedDebtCount: 1 });
});
```

- [x] **Step 2: Implement append-preserving appointment actions**

```ts
export function clientDebtSummary(rows: Array<{ status: string; totalCents: number; paidCents: number }>) {
  const completed = rows.filter((row) => row.status === 'TERMINADO' && row.totalCents > row.paidCents);
  return {
    completedDebtCents: completed.reduce((sum, row) => sum + row.totalCents - row.paidCents, 0),
    completedDebtCount: completed.length,
  };
}
```

Both roles may create or reschedule appointments. Office may assign any seeded
technician; a technician may schedule only themselves on an existing assigned
job. Cancellation retains the row and requires a reason. Every action revalidates
`/citas` and its detail route.

```ts
async function assertAppointmentManager(id: string) {
  const user = await requireUser();
  const appointment = db.prepare('SELECT assigned_technician_id FROM appointments WHERE id=?')
    .get(id) as { assigned_technician_id: string | null } | undefined;
  if (!appointment) throw new Error('NOT_FOUND');
  if (user.role !== 'ADMIN' && appointment.assigned_technician_id !== user.id) throw new Error('FORBIDDEN');
  return user;
}

export async function cancelAppointment(id: string, data: FormData) {
  await assertAppointmentManager(id);
  const reason = requiredText(data, 'reason');
  db.prepare(`UPDATE appointments SET status='CANCELADA', cancellation_reason=?,
    updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(reason, id);
  revalidatePath('/citas');
  revalidatePath(`/citas/${id}`);
}
```

- [x] **Step 3: Build appointment list and detail pages**

Show status, client, technician, date/time, work link, and notes. On both list and
detail, show a red debt notice when `completedDebtCents > 0`, including amount
and number of completed unpaid jobs.

```tsx
{debt.completedDebtCents > 0 && (
  <aside className="debt-notice" role="status">
    Este cliente mantiene {formatUyu(debt.completedDebtCents)} pendientes en
    {debt.completedDebtCount} trabajos terminados.
  </aside>
)}
```

- [x] **Step 4: Verify and commit appointments**

Run: `npx vitest run tests/unit/debts.test.ts; npm run lint; npm run build`  
Expected: all commands pass.

```bash
git add src/app/actions/appointments.ts src/app/citas src/lib/debts.ts tests/unit/debts.test.ts src/components/app-shell.tsx
git commit -m "feat: add appointments and debt alerts"
```

### Task 5: Implement jobs, visit parts, materials, and flexible collections

**Files:**
- Create: `src/app/actions/work-orders.ts`
- Modify: `src/app/partes/page.tsx`
- Modify: `src/app/partes/[id]/page.tsx`
- Create: `src/app/partes/[id]/visitas/nueva/page.tsx`
- Remove: `src/app/actions.ts`

**Interfaces:**
- Produces: `createWorkOrder`, `createVisit`, `completeVisit`, `addMaterialUsage`, `recordPayment`, and `createBudget`.
- Consumes: active clients, active materials, fixed technicians, rules from Task 2, and appointments from Task 4.

- [x] **Step 1: Implement transactional visit completion**

```ts
const complete = db.transaction(() => {
  if (isFirstCompletedVisit) assertWorkOrderTerms(totalCents, collectionMode);
  db.prepare(`UPDATE visits SET ended_at=?, notes=?, resulting_status=? WHERE id=?`)
    .run(endedAt, notes, resultingStatus, visitId);
  db.prepare(`UPDATE work_orders SET status=?, total_cents=COALESCE(total_cents, ?),
    collection_mode=COALESCE(collection_mode, ?),
    planned_installments=COALESCE(planned_installments, ?) WHERE id=?`)
    .run(resultingStatus, totalCents, collectionMode, plannedInstallments, workOrderId);
});
```

Validate end time after start time. Preserve the assigned technician. Only the
assigned technician may complete visits, consume materials, or record payment.
Office and that technician may create subsequent scheduled visits.

- [x] **Step 2: Record real payments and material snapshots**

Before payment insert, calculate `total_cents - SUM(payments.amount_cents)` and
reject excess. Insert materials using the selected active material and copy its
current `cost_cents` into `unit_cost_cents_snapshot`.

```ts
assertMovementAllowed(order.total_cents, paidCents, amountCents);
db.prepare(`INSERT INTO payments
  (id,work_order_id,visit_id,received_by_id,amount_cents,method)
  VALUES (?,?,?,?,?,?)`).run(uid(), workOrderId, visitId, user.id, amountCents, method);

db.prepare(`INSERT INTO material_usages
  (id,visit_id,material_id,technician_id,quantity,unit_cost_cents_snapshot)
  VALUES (?,?,?,?,?,?)`).run(uid(), visitId, material.id, user.id, quantity, material.cost_cents);
```

- [x] **Step 3: Build the job and visit interface**

Create approved type selectors, first-visit terms (`CONTADO`, `FINANCIADO`,
`DEUDA_ABIERTA`), optional installment count, optional payment, optional material
rows, start/end times, and resulting status. Show all previous jobs for the client
regardless of technician. A finished job may retain and display debt.

```tsx
<label>Resultado del trabajo
  <select name="resultingStatus" required>
    <option value="EN_PROCESO">Continúa en proceso</option>
    <option value="TERMINADO">Trabajo terminado</option>
  </select>
</label>
```

- [x] **Step 4: Verify role flows and commit**

Run: `npm test; npm run lint; npm run build`  
Expected: all pass; manual Office access cannot expose payment actions.

```bash
git add src/app/actions src/app/partes
git commit -m "feat: add multi-visit work orders"
```

### Task 6: Add filtered operational reports

**Files:**
- Create: `src/lib/reports.ts`
- Create: `tests/unit/reports.test.ts`
- Create: `src/app/informes/page.tsx`
- Modify: `src/components/app-shell.tsx`

**Interfaces:**
- Produces query functions `clientWorkReport`, `clientDebtReport`, `technicianWorkReport`, `materialUsageReport`, and `catalogReport`.
- Consumes filters `{ from?: string; to?: string; clientId?: string; technicianId?: string; status?: string; materialId?: string; supplierId?: string }`.

- [x] **Step 1: Write grouped-total report tests**

```ts
it('returns client subtotals and a grand debt total', () => {
  const testDatabase = new Database(':memory:');
  initializeSchema(testDatabase);
  testDatabase.exec(`
    INSERT INTO users (id,name,email,password_hash,role) VALUES ('t1','Técnico','t@local','x','TECNICO');
    INSERT INTO clients (id,name,phone) VALUES ('c1','Cliente','099');
    INSERT INTO work_orders
      (id,client_id,assigned_technician_id,created_by_id,type,description,status,total_cents,collection_mode)
      VALUES ('w1','c1','t1','t1','TRABAJO_GENERAL','Trabajo','TERMINADO',100000,'DEUDA_ABIERTA');
    INSERT INTO visits
      (id,work_order_id,technician_id,visit_date,started_at,ended_at,notes,resulting_status,created_by_id)
      VALUES ('v1','w1','t1','2026-09-12','2026-09-12T10:00:00','2026-09-12T11:00:00','Fin','TERMINADO','t1');
    INSERT INTO payments (id,work_order_id,visit_id,received_by_id,amount_cents,method)
      VALUES ('p1','w1','v1','t1',30000,'EFECTIVO');
  `);
  const report = clientDebtReport(testDatabase, {});
  expect(report.groups[0].subtotalCents).toBe(70_000);
  expect(report.totalCents).toBe(report.groups.reduce((sum, group) => sum + group.subtotalCents, 0));
});
```

- [x] **Step 2: Implement parameterized report queries**

Build SQL conditions and parameters from supplied filters only. Calculate totals
from payments, never financing terms. Group job totals by client or technician
and material quantities/cost snapshots by material and technician.

```ts
export type ReportFilters = {
  from?: string; to?: string; clientId?: string; technicianId?: string;
  status?: string; materialId?: string; supplierId?: string;
};
type DebtRow = { clientId: string; clientName: string; workOrderId: string; totalCents: number; debtCents: number };

export function clientDebtReport(database: Database.Database, filters: ReportFilters) {
  const clauses = ["w.status='TERMINADO'"];
  const params: string[] = [];
  if (filters.from) { clauses.push('date(w.closed_at)>=date(?)'); params.push(filters.from); }
  if (filters.to) { clauses.push('date(w.closed_at)<=date(?)'); params.push(filters.to); }
  if (filters.clientId) { clauses.push('c.id=?'); params.push(filters.clientId); }
  const rows = database.prepare(`SELECT c.id clientId, c.name clientName,
    w.id workOrderId, w.total_cents totalCents,
    w.total_cents-COALESCE(SUM(p.amount_cents),0) debtCents
    FROM work_orders w JOIN clients c ON c.id=w.client_id
    LEFT JOIN payments p ON p.work_order_id=w.id
    WHERE ${clauses.join(' AND ')}
    GROUP BY w.id HAVING debtCents>0 ORDER BY c.name`).all(...params);
  const byClient = new Map<string, DebtRow[]>();
  for (const row of rows as DebtRow[]) byClient.set(row.clientId, [...(byClient.get(row.clientId) ?? []), row]);
  const groups = [...byClient.values()].map((clientRows) => ({
    clientId: clientRows[0].clientId,
    clientName: clientRows[0].clientName,
    rows: clientRows,
    subtotalCents: clientRows.reduce((sum, row) => sum + row.debtCents, 0),
  }));
  return { groups, totalCents: groups.reduce((sum, group) => sum + group.subtotalCents, 0) };
}
```

- [x] **Step 3: Build one report hub with five views**

Use `searchParams` for type and filters so results are linkable. Render clients
with detailed jobs, debt/financing, work by technician, material usage, and
material/supplier catalogs. Show group subtotals and a final total row.

```tsx
<form className="report-filters">
  <select name="type" defaultValue={type}>
    <option value="clientes">Clientes y trabajos</option>
    <option value="deudas">Deudas y financiación</option>
    <option value="tecnicos">Trabajos por técnico</option>
    <option value="materiales">Uso de materiales</option>
    <option value="catalogos">Materiales y proveedores</option>
  </select>
  <input name="from" type="date" defaultValue={filters.from} />
  <input name="to" type="date" defaultValue={filters.to} />
  <button>Aplicar filtros</button>
</form>
```

- [x] **Step 4: Verify and commit reports**

Run: `npx vitest run tests/unit/reports.test.ts; npm run lint; npm run build`  
Expected: all pass.

```bash
git add src/lib/reports.ts tests/unit/reports.test.ts src/app/informes src/components/app-shell.tsx
git commit -m "feat: add operational reports"
```

### Task 7: Apply the approved technical-workbook design and document delivery

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/clientes/page.tsx`
- Modify: `src/app/clientes/[id]/page.tsx`
- Modify: `src/app/proveedores/page.tsx`
- Modify: `src/app/materiales/page.tsx`
- Modify: `src/app/citas/page.tsx`
- Modify: `src/app/citas/[id]/page.tsx`
- Modify: `src/app/partes/page.tsx`
- Modify: `src/app/partes/[id]/page.tsx`
- Modify: `src/app/partes/[id]/visitas/nueva/page.tsx`
- Modify: `src/app/informes/page.tsx`
- Modify: `docs/architecture.md`
- Modify: `docs/current-state.md`
- Create: `docs/decisions/003-jobs-visits-and-debt.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: the approved palette and layout in `docs/plans/2026-09-12-technical-workbook-ui-design.md`.
- Produces: responsive Office and technician workspaces with visible focus and reduced-motion support.

- [x] **Step 1: Implement visual tokens and responsive components**

```css
:root { --paper:#f3f0e8; --ink:#1d2a35; --service:#16697a;
  --attention:#f4b942; --closed:#2f7d5a; --incident:#b7473a; }
:focus-visible { outline:3px solid var(--attention); outline-offset:3px; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition:none !important; scroll-behavior:auto; }
}
```

Apply the shared header, workbench grids, status strip, dense tables, forms,
debt notices, empty states, and 320 px layout from the visual implementation
plan. Use local font stacks and no decorative gradients.

- [x] **Step 2: Reset disposable data and initialize the new schema**

Run: `npm run db:reset`  
Expected: only `data/generico-servicios.db` is recreated and four fixed users are seeded.

- [x] **Step 3: Verify both roles in the browser**

Office: create/edit/archive a client, create supplier/material, schedule and
reschedule a visit, assign a technician, and view all reports. Technician:
inspect prior client history and debt notice, complete two visits on one job,
record a material and partial payment, then finish with remaining debt.

- [x] **Step 4: Update documentation**

Document tables, domain modules, role navigation, reset state, and test results.
ADR 003 must record the separation of jobs, visits, financing terms, real
payments, and derived debt. README must describe the new local test flow.

- [x] **Step 5: Run final verification and commit**

Run: `npm run docs:check-guides; npm test; npm run lint; npm run build`  
Expected: all commands exit `0`.

```bash
git add src README.md docs
git commit -m "feat: complete local operations workspace"
```

## Self-Review

- Data model and reset: Task 1 covers disposable data and every approved entity.
- Roles and lifecycle: Tasks 2, 4, and 5 cover fixed assignment, visits, collections, debt, and client history.
- Office CRUD and archival: Task 3 covers clients, suppliers, materials, and historical deletion rules; Task 4 covers non-deleting appointments.
- Reports: Task 6 covers every requested on-screen report with filters, subtotals, and totals.
- Visual design and documentation: Task 7 integrates the previously approved design and updates architecture, state, ADR, and README.
