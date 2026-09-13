'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin, requireUser } from '@/lib/auth';
import { db, uid } from '@/lib/db';
import { optionalText, requiredText } from './form-data';

function assertNoDuplicate(name: string, phone: string, excludedId?: string) {
  const duplicate = db
    .prepare(`SELECT id FROM clients
      WHERE lower(name)=lower(?) AND phone=? AND (? IS NULL OR id<>?)`)
    .get(name, phone, excludedId ?? null, excludedId ?? null);
  if (duplicate) throw new Error('CLIENT_ALREADY_EXISTS');
}

export async function createClient(data: FormData) {
  await requireUser();
  const name = requiredText(data, 'name');
  const phone = requiredText(data, 'phone');
  assertNoDuplicate(name, phone);

  db.prepare('INSERT INTO clients (id,name,phone,email,address) VALUES (?,?,?,?,?)')
    .run(
      uid(),
      name,
      phone,
      optionalText(data, 'email'),
      optionalText(data, 'address'),
    );
  revalidatePath('/clientes');
}

export async function updateClient(clientId: string, data: FormData) {
  await requireUser();
  const name = requiredText(data, 'name');
  const phone = requiredText(data, 'phone');
  assertNoDuplicate(name, phone, clientId);

  const result = db.prepare(`UPDATE clients SET name=?, phone=?, email=?, address=?,
    updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(
    name,
    phone,
    optionalText(data, 'email'),
    optionalText(data, 'address'),
    clientId,
  );
  if (result.changes === 0) throw new Error('NOT_FOUND');
  revalidatePath('/clientes');
  revalidatePath(`/clientes/${clientId}`);
}

export async function archiveClient(clientId: string) {
  const user = await requireUser();
  assertAdmin(user);
  db.prepare("UPDATE clients SET status='ARCHIVADO', updated_at=CURRENT_TIMESTAMP WHERE id=?")
    .run(clientId);
  revalidatePath('/clientes');
  revalidatePath(`/clientes/${clientId}`);
}

export async function restoreClient(clientId: string) {
  const user = await requireUser();
  assertAdmin(user);
  db.prepare("UPDATE clients SET status='ACTIVO', updated_at=CURRENT_TIMESTAMP WHERE id=?")
    .run(clientId);
  revalidatePath('/clientes');
  revalidatePath(`/clientes/${clientId}`);
}
