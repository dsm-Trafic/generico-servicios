import 'dotenv/config';
import { existsSync, unlinkSync } from 'node:fs';
import { basename, join } from 'node:path';
const path = join(process.cwd(),'data',basename(process.env.DATABASE_FILE ?? 'generico-servicios.db'));
if (existsSync(path)) unlinkSync(path);
await import('../src/lib/db');
console.log('Base local reiniciada con las cuatro cuentas de prueba');
