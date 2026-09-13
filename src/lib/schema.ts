import type Database from 'better-sqlite3';

export function initializeSchema(database: Database.Database) {
  database.pragma('foreign_keys = ON');
  database.pragma('journal_mode = WAL');

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ADMIN', 'TECNICO')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVO' CHECK(status IN ('ACTIVO', 'ARCHIVADO')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS clients_name_idx ON clients(name);
    CREATE INDEX IF NOT EXISTS clients_phone_idx ON clients(phone);

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVO' CHECK(status IN ('ACTIVO', 'ARCHIVADO')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      model TEXT NOT NULL,
      supplier_id TEXT NOT NULL REFERENCES suppliers(id),
      cost_cents INTEGER NOT NULL CHECK(cost_cents >= 0),
      status TEXT NOT NULL DEFAULT 'ACTIVO' CHECK(status IN ('ACTIVO', 'ARCHIVADO')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS materials_name_idx ON materials(name, model);

    CREATE TABLE IF NOT EXISTS work_orders (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id),
      assigned_technician_id TEXT NOT NULL REFERENCES users(id),
      created_by_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL CHECK(type IN (
        'TRABAJO_GENERAL', 'URGENCIA', 'MANTENIMIENTO', 'SOLICITUD_PRESUPUESTO'
      )),
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDIENTE'
        CHECK(status IN ('PENDIENTE', 'EN_PROCESO', 'TERMINADO')),
      total_cents INTEGER CHECK(total_cents > 0),
      collection_mode TEXT CHECK(collection_mode IN ('CONTADO', 'FINANCIADO', 'DEUDA_ABIERTA')),
      planned_installments INTEGER CHECK(planned_installments > 0),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      closed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS work_orders_client_idx ON work_orders(client_id);
    CREATE INDEX IF NOT EXISTS work_orders_technician_idx ON work_orders(assigned_technician_id);

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id),
      work_order_id TEXT REFERENCES work_orders(id),
      assigned_technician_id TEXT REFERENCES users(id),
      scheduled_at TEXT,
      status TEXT NOT NULL DEFAULT 'PENDIENTE_AGENDAR' CHECK(status IN (
        'PENDIENTE_AGENDAR', 'AGENDADA', 'REAGENDADA', 'REALIZADA', 'CANCELADA'
      )),
      notes TEXT,
      cancellation_reason TEXT,
      created_by_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS appointments_schedule_idx ON appointments(scheduled_at, status);

    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY,
      work_order_id TEXT NOT NULL REFERENCES work_orders(id),
      appointment_id TEXT UNIQUE REFERENCES appointments(id),
      technician_id TEXT NOT NULL REFERENCES users(id),
      visit_date TEXT NOT NULL,
      started_at TEXT,
      ended_at TEXT,
      notes TEXT,
      resulting_status TEXT CHECK(resulting_status IN ('EN_PROCESO', 'TERMINADO')),
      created_by_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS visits_work_order_idx ON visits(work_order_id, visit_date);

    CREATE TABLE IF NOT EXISTS material_usages (
      id TEXT PRIMARY KEY,
      visit_id TEXT NOT NULL REFERENCES visits(id),
      material_id TEXT NOT NULL REFERENCES materials(id),
      technician_id TEXT NOT NULL REFERENCES users(id),
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      unit_cost_cents_snapshot INTEGER NOT NULL CHECK(unit_cost_cents_snapshot >= 0),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      work_order_id TEXT NOT NULL REFERENCES work_orders(id),
      visit_id TEXT NOT NULL REFERENCES visits(id),
      received_by_id TEXT NOT NULL REFERENCES users(id),
      amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
      method TEXT NOT NULL CHECK(method IN ('EFECTIVO', 'TRANSFERENCIA', 'MERCADO_PAGO')),
      received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS payments_work_order_idx ON payments(work_order_id);

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      work_order_id TEXT NOT NULL REFERENCES work_orders(id),
      status TEXT NOT NULL DEFAULT 'BORRADOR',
      total_cents INTEGER NOT NULL CHECK(total_cents >= 0),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS budget_lines (
      id TEXT PRIMARY KEY,
      budget_id TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
      concept TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      unit_price_cents INTEGER NOT NULL CHECK(unit_price_cents >= 0)
    );
  `);
}
