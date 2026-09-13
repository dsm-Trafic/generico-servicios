import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { randomUUID, scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { initializeSchema } from './schema';

const dataDirectory = join(process.cwd(), 'data');
const databasePath = join(dataDirectory, basename(process.env.DATABASE_FILE ?? 'generico-servicios.db'));
mkdirSync(dataDirectory, { recursive: true });

export const db = new Database(databasePath);
initializeSchema(db);

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
