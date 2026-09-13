'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { assertAdmin, requireUser } from '@/lib/auth';
import { db, uid } from '@/lib/db';
import { toCents } from '@/lib/money';
import {
  assertCanCompleteVisit,
  assertCanRecordPayment,
  assertMovementAllowed,
  assertWorkOrderTerms,
} from '@/lib/rules';
import { optionalText, requiredText } from './form-data';

const workOrderTypes = new Set([
  'TRABAJO_GENERAL',
  'URGENCIA',
  'MANTENIMIENTO',
  'SOLICITUD_PRESUPUESTO',
]);

type WorkOrderAccess = {
  id: string;
  client_id: string;
  assigned_technician_id: string;
  type: string;
  status: string;
  total_cents: number | null;
};

type VisitAccess = {
  id: string;
  work_order_id: string;
  appointment_id: string | null;
  technician_id: string;
  started_at: string | null;
  ended_at: string | null;
  status: string;
  total_cents: number | null;
};

function getWorkOrder(id: string) {
  const order = db.prepare(`SELECT id,client_id,assigned_technician_id,type,status,total_cents
    FROM work_orders WHERE id=?`).get(id) as WorkOrderAccess | undefined;
  if (!order) throw new Error('NOT_FOUND');
  return order;
}

function getVisit(id: string) {
  const visit = db.prepare(`SELECT v.id,v.work_order_id,v.appointment_id,v.technician_id,
    v.started_at,v.ended_at,w.status,w.total_cents
    FROM visits v JOIN work_orders w ON w.id=v.work_order_id
    WHERE v.id=?`).get(id) as VisitAccess | undefined;
  if (!visit) throw new Error('NOT_FOUND');
  return visit;
}

function refreshWorkOrder(id: string) {
  revalidatePath('/');
  revalidatePath('/partes');
  revalidatePath(`/partes/${id}`);
  revalidatePath('/citas');
  revalidatePath('/informes');
}

export async function createWorkOrder(data: FormData) {
  const user = await requireUser();
  const clientId = requiredText(data, 'clientId');
  const type = requiredText(data, 'type');
  const appointmentId = optionalText(data, 'appointmentId');
  if (!workOrderTypes.has(type)) throw new Error('INVALID_WORK_ORDER_TYPE');

  const client = db.prepare("SELECT id FROM clients WHERE id=? AND status='ACTIVO'")
    .get(clientId);
  if (!client) throw new Error('ACTIVE_CLIENT_REQUIRED');

  let technicianId = user.role === 'ADMIN'
    ? requiredText(data, 'technicianId')
    : user.id;

  if (appointmentId) {
    const appointment = db.prepare(`SELECT client_id,assigned_technician_id,status
      FROM appointments WHERE id=?`).get(appointmentId) as
      { client_id:string; assigned_technician_id:string|null; status:string } | undefined;
    if (!appointment || appointment.client_id !== clientId) {
      throw new Error('APPOINTMENT_CLIENT_MISMATCH');
    }
    if (appointment.status === 'CANCELADA' || appointment.status === 'REALIZADA') {
      throw new Error('APPOINTMENT_CLOSED');
    }
    if (user.role !== 'ADMIN' && appointment.assigned_technician_id !== user.id) {
      throw new Error('FORBIDDEN');
    }
    technicianId = appointment.assigned_technician_id ?? technicianId;
  } else if (user.role === 'TECNICO' && type !== 'URGENCIA') {
    throw new Error('TECHNICIAN_CAN_ONLY_CREATE_URGENCY');
  }

  const technician = db.prepare("SELECT id FROM users WHERE id=? AND role='TECNICO'")
    .get(technicianId);
  if (!technician) throw new Error('TECHNICIAN_REQUIRED');

  const workOrderId = uid();
  db.transaction(() => {
    db.prepare(`INSERT INTO work_orders
      (id,client_id,assigned_technician_id,created_by_id,type,description)
      VALUES (?,?,?,?,?,?)`).run(
      workOrderId,
      clientId,
      technicianId,
      user.id,
      type,
      requiredText(data, 'description'),
    );
    if (appointmentId) {
      db.prepare(`UPDATE appointments SET work_order_id=?,assigned_technician_id=?,
        updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(
        workOrderId,
        technicianId,
        appointmentId,
      );
    }
  })();

  redirect(`/partes/${workOrderId}`);
}

export async function createVisit(workOrderId: string, data: FormData) {
  const user = await requireUser();
  const order = getWorkOrder(workOrderId);
  assertCanCompleteVisit(user.role, user.id, order.assigned_technician_id);
  if (order.status === 'TERMINADO') throw new Error('WORK_ORDER_CLOSED');

  const openVisit = db.prepare(`SELECT id FROM visits
    WHERE work_order_id=? AND ended_at IS NULL`).get(workOrderId);
  if (openVisit) throw new Error('OPEN_VISIT_EXISTS');

  let totalCents: number | null = null;
  let collectionMode: string | null = null;
  let plannedInstallments: number | null = null;
  if (order.total_cents === null) {
    totalCents = toCents(requiredText(data, 'total'));
    collectionMode = requiredText(data, 'collectionMode');
    const installments = optionalText(data, 'plannedInstallments');
    plannedInstallments = installments === null ? null : Number(installments);
    assertWorkOrderTerms(totalCents, collectionMode, plannedInstallments);
  }

  const appointmentId = optionalText(data, 'appointmentId');
  if (appointmentId) {
    const appointment = db.prepare(`SELECT work_order_id,assigned_technician_id,status
      FROM appointments WHERE id=?`).get(appointmentId) as
      {work_order_id:string|null;assigned_technician_id:string|null;status:string}|undefined;
    if (
      !appointment ||
      appointment.work_order_id !== workOrderId ||
      appointment.assigned_technician_id !== user.id ||
      ['CANCELADA','REALIZADA'].includes(appointment.status)
    ) {
      throw new Error('INVALID_APPOINTMENT');
    }
  }

  const visitId = uid();
  db.transaction(() => {
    db.prepare(`INSERT INTO visits
      (id,work_order_id,appointment_id,technician_id,visit_date,started_at,created_by_id)
      VALUES (?,?,?,?,?,?,?)`).run(
      visitId,
      workOrderId,
      appointmentId,
      user.id,
      requiredText(data, 'visitDate'),
      requiredText(data, 'startedAt'),
      user.id,
    );
    db.prepare(`UPDATE work_orders SET status='EN_PROCESO',
      total_cents=COALESCE(total_cents,?),collection_mode=COALESCE(collection_mode,?),
      planned_installments=COALESCE(planned_installments,?) WHERE id=?`).run(
      totalCents,
      collectionMode,
      plannedInstallments,
      workOrderId,
    );
  })();
  redirect(`/partes/${workOrderId}`);
}

export async function addMaterialUsage(visitId: string, data: FormData) {
  const user = await requireUser();
  const visit = getVisit(visitId);
  assertCanCompleteVisit(user.role, user.id, visit.technician_id);
  if (visit.ended_at) throw new Error('VISIT_CLOSED');

  const quantity = Number(requiredText(data, 'quantity'));
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new Error('INVALID_MATERIAL_QUANTITY');
  }
  const material = db.prepare(`SELECT id,cost_cents FROM materials
    WHERE id=? AND status='ACTIVO'`).get(requiredText(data, 'materialId')) as
    {id:string;cost_cents:number}|undefined;
  if (!material) throw new Error('ACTIVE_MATERIAL_REQUIRED');

  db.prepare(`INSERT INTO material_usages
    (id,visit_id,material_id,technician_id,quantity,unit_cost_cents_snapshot)
    VALUES (?,?,?,?,?,?)`).run(
    uid(),
    visitId,
    material.id,
    user.id,
    quantity,
    material.cost_cents,
  );
  refreshWorkOrder(visit.work_order_id);
}

export async function recordPayment(visitId: string, data: FormData) {
  const user = await requireUser();
  const visit = getVisit(visitId);
  assertCanRecordPayment(user.role, user.id, visit.technician_id);
  if (visit.ended_at) throw new Error('VISIT_CLOSED');
  if (visit.total_cents === null) throw new Error('WORK_ORDER_TERMS_REQUIRED');

  const amountCents = toCents(requiredText(data, 'amount'));
  const paid = db.prepare(`SELECT COALESCE(SUM(amount_cents),0) total
    FROM payments WHERE work_order_id=?`).get(visit.work_order_id) as {total:number};
  assertMovementAllowed(visit.total_cents, paid.total, amountCents);
  const method = requiredText(data, 'method');
  if (!['EFECTIVO','TRANSFERENCIA','MERCADO_PAGO'].includes(method)) {
    throw new Error('INVALID_PAYMENT_METHOD');
  }

  db.prepare(`INSERT INTO payments
    (id,work_order_id,visit_id,received_by_id,amount_cents,method)
    VALUES (?,?,?,?,?,?)`).run(
    uid(),
    visit.work_order_id,
    visitId,
    user.id,
    amountCents,
    method,
  );
  refreshWorkOrder(visit.work_order_id);
}

export async function completeVisit(visitId: string, data: FormData) {
  const user = await requireUser();
  const visit = getVisit(visitId);
  assertCanCompleteVisit(user.role, user.id, visit.technician_id);
  if (visit.ended_at || !visit.started_at) throw new Error('VISIT_NOT_OPEN');

  const endedAt = requiredText(data, 'endedAt');
  if (new Date(endedAt).getTime() <= new Date(visit.started_at).getTime()) {
    throw new Error('INVALID_VISIT_TIME');
  }
  const resultingStatus = requiredText(data, 'resultingStatus');
  if (!['EN_PROCESO','TERMINADO'].includes(resultingStatus)) {
    throw new Error('INVALID_WORK_ORDER_STATUS');
  }
  const notes = requiredText(data, 'notes');

  db.transaction(() => {
    db.prepare(`UPDATE visits SET ended_at=?,notes=?,resulting_status=? WHERE id=?`)
      .run(endedAt, notes, resultingStatus, visitId);
    db.prepare(`UPDATE work_orders SET status=?,closed_at=? WHERE id=?`).run(
      resultingStatus,
      resultingStatus === 'TERMINADO' ? endedAt : null,
      visit.work_order_id,
    );
    if (visit.appointment_id) {
      db.prepare(`UPDATE appointments SET status='REALIZADA',updated_at=CURRENT_TIMESTAMP
        WHERE id=?`).run(visit.appointment_id);
    }
  })();
  refreshWorkOrder(visit.work_order_id);
}

export async function createBudget(workOrderId: string, data: FormData) {
  const user = await requireUser();
  assertAdmin(user);
  const order = getWorkOrder(workOrderId);
  if (order.type !== 'SOLICITUD_PRESUPUESTO') throw new Error('QUOTE_REQUEST_REQUIRED');

  const quantity = Number(requiredText(data, 'quantity'));
  const unitPrice = toCents(requiredText(data, 'unitPrice'));
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error('INVALID_BUDGET');
  const budgetId = uid();
  db.transaction(() => {
    db.prepare('INSERT INTO budgets (id,work_order_id,total_cents) VALUES (?,?,?)')
      .run(budgetId, workOrderId, quantity * unitPrice);
    db.prepare(`INSERT INTO budget_lines
      (id,budget_id,concept,quantity,unit_price_cents) VALUES (?,?,?,?,?)`).run(
      uid(),
      budgetId,
      requiredText(data, 'concept'),
      quantity,
      unitPrice,
    );
  })();
  refreshWorkOrder(workOrderId);
}
