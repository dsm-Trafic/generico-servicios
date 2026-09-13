import 'dotenv/config';
import { existsSync, unlinkSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

const dataDirectory = resolve(process.cwd(), 'data');
const databasePath = join(
  dataDirectory,
  basename(process.env.DATABASE_FILE ?? 'generico-servicios.db'),
);

if (dirname(databasePath) !== dataDirectory) {
  throw new Error('INVALID_DATABASE_PATH');
}

if (existsSync(databasePath)) unlinkSync(databasePath);
await import('../src/lib/db');
console.log(`Base local reiniciada en ${databasePath} con las cuatro cuentas de prueba`);
