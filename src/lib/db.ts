import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { randomUUID, scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

const dataDirectory = join(process.cwd(), 'data');
const databasePath = join(dataDirectory, basename(process.env.DATABASE_FILE ?? 'generico-servicios.db'));
mkdirSync(dataDirectory, { recursive: true });

export const db = new Database(databasePath);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('ADMIN','TECNICO')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL,
  email TEXT, address TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS clients_name_idx ON clients(name);
CREATE INDEX IF NOT EXISTS clients_phone_idx ON clients(phone);
CREATE TABLE IF NOT EXISTS work_orders (
  id TEXT PRIMARY KEY, client_id TEXT NOT NULL REFERENCES clients(id),
  assigned_technician_id TEXT REFERENCES users(id), created_by_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'PENDIENTE',
  work_date TEXT NOT NULL, started_at TEXT, duration_minutes INTEGER,
  description TEXT NOT NULL, total_cents INTEGER NOT NULL DEFAULT 0,
  closed_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY, work_order_id TEXT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  name TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity > 0)
);
CREATE TABLE IF NOT EXISTS financial_movements (
  id TEXT PRIMARY KEY, recorded_on_id TEXT NOT NULL REFERENCES work_orders(id),
  applied_to_id TEXT NOT NULL REFERENCES work_orders(id), kind TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK(amount_cents > 0), payment_method TEXT,
  installment_count INTEGER, created_by_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY, work_order_id TEXT NOT NULL REFERENCES work_orders(id),
  status TEXT NOT NULL DEFAULT 'BORRADOR', total_cents INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS budget_lines (
  id TEXT PRIMARY KEY, budget_id TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  concept TEXT NOT NULL, quantity INTEGER NOT NULL, unit_price_cents INTEGER NOT NULL
);
`);

export type AppUser = { id: string; name: string; email: string; role: 'ADMIN' | 'TECNICO' };

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, expected] = stored.split(':');
  if (!salt || !expected) return false;
  return timingSafeEqual(Buffer.from(expected, 'hex'), scryptSync(password, salt, 64));
}

function seedUser(name: string, email: string, password: string, role: AppUser['role']) {
  db.prepare('INSERT OR IGNORE INTO users (id,name,email,password_hash,role) VALUES (?,?,?,?,?)')
    .run(randomUUID(), name, email, hashPassword(password), role);
}

export function ensureSeedData() {
  seedUser('Administración', process.env.ADMIN_EMAIL ?? 'admin@example.local', process.env.ADMIN_PASSWORD ?? 'Cambiar-Admin-123', 'ADMIN');
  for (let index = 1; index <= 3; index++) {
    seedUser(`Técnico ${index}`, process.env[`TECHNICIAN_${index}_EMAIL`] ?? `tecnico${index}@example.local`, process.env[`TECHNICIAN_${index}_PASSWORD`] ?? 'Cambiar-Tecnico-123', 'TECNICO');
  }
}

ensureSeedData();

export function uid() { return randomUUID(); }
