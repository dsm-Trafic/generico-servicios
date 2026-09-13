'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin, requireUser } from '@/lib/auth';
import { db, uid } from '@/lib/db';
import { toCents } from '@/lib/money';
import { optionalText, requiredText } from './form-data';

async function requireOffice() {
  const user = await requireUser();
  assertAdmin(user);
}

function refreshCatalogs() {
  revalidatePath('/proveedores');
  revalidatePath('/materiales');
}

export async function createSupplier(data: FormData) {
  await requireOffice();
  db.prepare('INSERT INTO suppliers (id,name,phone,email,notes) VALUES (?,?,?,?,?)')
    .run(
      uid(),
      requiredText(data, 'name'),
      optionalText(data, 'phone'),
      optionalText(data, 'email'),
      optionalText(data, 'notes'),
    );
  refreshCatalogs();
}

export async function updateSupplier(supplierId: string, data: FormData) {
  await requireOffice();
  db.prepare(`UPDATE suppliers SET name=?,phone=?,email=?,notes=?,
    updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(
    requiredText(data, 'name'),
    optionalText(data, 'phone'),
    optionalText(data, 'email'),
    optionalText(data, 'notes'),
    supplierId,
  );
  refreshCatalogs();
}

export async function deleteOrArchiveSupplier(supplierId: string) {
  await requireOffice();
  const linked = db.prepare('SELECT COUNT(*) count FROM materials WHERE supplier_id=?')
    .get(supplierId) as { count: number };
  if (linked.count === 0) {
    db.prepare('DELETE FROM suppliers WHERE id=?').run(supplierId);
  } else {
    db.prepare("UPDATE suppliers SET status='ARCHIVADO',updated_at=CURRENT_TIMESTAMP WHERE id=?")
      .run(supplierId);
  }
  refreshCatalogs();
}

export async function restoreSupplier(supplierId: string) {
  await requireOffice();
  db.prepare("UPDATE suppliers SET status='ACTIVO',updated_at=CURRENT_TIMESTAMP WHERE id=?")
    .run(supplierId);
  refreshCatalogs();
}

export async function createMaterial(data: FormData) {
  await requireOffice();
  const supplierId = requiredText(data, 'supplierId');
  const supplier = db.prepare("SELECT id FROM suppliers WHERE id=? AND status='ACTIVO'")
    .get(supplierId);
  if (!supplier) throw new Error('ACTIVE_SUPPLIER_REQUIRED');

  db.prepare(`INSERT INTO materials
    (id,name,model,supplier_id,cost_cents) VALUES (?,?,?,?,?)`).run(
    uid(),
    requiredText(data, 'name'),
    requiredText(data, 'model'),
    supplierId,
    toCents(requiredText(data, 'cost')),
  );
  refreshCatalogs();
}

export async function updateMaterial(materialId: string, data: FormData) {
  await requireOffice();
  const supplierId = requiredText(data, 'supplierId');
  const supplier = db.prepare('SELECT id FROM suppliers WHERE id=?').get(supplierId);
  if (!supplier) throw new Error('SUPPLIER_REQUIRED');

  db.prepare(`UPDATE materials SET name=?,model=?,supplier_id=?,cost_cents=?,
    updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(
    requiredText(data, 'name'),
    requiredText(data, 'model'),
    supplierId,
    toCents(requiredText(data, 'cost')),
    materialId,
  );
  refreshCatalogs();
}

export async function deleteOrArchiveMaterial(materialId: string) {
  await requireOffice();
  const linked = db.prepare('SELECT COUNT(*) count FROM material_usages WHERE material_id=?')
    .get(materialId) as { count: number };
  if (linked.count === 0) {
    db.prepare('DELETE FROM materials WHERE id=?').run(materialId);
  } else {
    db.prepare("UPDATE materials SET status='ARCHIVADO',updated_at=CURRENT_TIMESTAMP WHERE id=?")
      .run(materialId);
  }
  refreshCatalogs();
}

export async function restoreMaterial(materialId: string) {
  await requireOffice();
  const material = db.prepare(`SELECT s.status supplier_status FROM materials m
    JOIN suppliers s ON s.id=m.supplier_id WHERE m.id=?`).get(materialId) as
    { supplier_status: string } | undefined;
  if (!material || material.supplier_status !== 'ACTIVO') {
    throw new Error('ACTIVE_SUPPLIER_REQUIRED');
  }
  db.prepare("UPDATE materials SET status='ACTIVO',updated_at=CURRENT_TIMESTAMP WHERE id=?")
    .run(materialId);
  refreshCatalogs();
}
