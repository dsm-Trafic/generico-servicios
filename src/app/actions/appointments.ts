'use server';

import { revalidatePath } from 'next/cache';
import { assertCanScheduleVisit } from '@/lib/rules';
import { db, uid } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { optionalText, requiredText } from './form-data';

type AppointmentOwner = {
  assigned_technician_id: string | null;
  work_order_id: string | null;
};

function refreshAppointment(id?: string) {
  revalidatePath('/');
  revalidatePath('/citas');
  if (id) revalidatePath(`/citas/${id}`);
}

function activeClient(clientId: string) {
  const client = db.prepare("SELECT id FROM clients WHERE id=? AND status='ACTIVO'")
    .get(clientId);
  if (!client) throw new Error('ACTIVE_CLIENT_REQUIRED');
}

function validTechnician(technicianId: string) {
  const technician = db.prepare("SELECT id FROM users WHERE id=? AND role='TECNICO'")
    .get(technicianId);
  if (!technician) throw new Error('TECHNICIAN_REQUIRED');
}

async function appointmentManager(id: string) {
  const user = await requireUser();
  const appointment = db.prepare(`SELECT assigned_technician_id,work_order_id
    FROM appointments WHERE id=?`).get(id) as AppointmentOwner | undefined;
  if (!appointment) throw new Error('NOT_FOUND');
  if (
    user.role !== 'ADMIN' &&
    appointment.assigned_technician_id !== user.id
  ) {
    throw new Error('FORBIDDEN');
  }
  return { user, appointment };
}

export async function createAppointment(data: FormData) {
  const user = await requireUser();
  const clientId = requiredText(data, 'clientId');
  const workOrderId = optionalText(data, 'workOrderId');
  const scheduledAt = optionalText(data, 'scheduledAt');
  activeClient(clientId);

  let technicianId = user.role === 'ADMIN'
    ? optionalText(data, 'technicianId')
    : user.id;

  if (workOrderId) {
    const workOrder = db.prepare(`SELECT client_id,assigned_technician_id
      FROM work_orders WHERE id=?`).get(workOrderId) as
      { client_id: string; assigned_technician_id: string } | undefined;
    if (!workOrder || workOrder.client_id !== clientId) {
      throw new Error('WORK_ORDER_CLIENT_MISMATCH');
    }
    assertCanScheduleVisit(
      user.role,
      user.id,
      workOrder.assigned_technician_id,
    );
    technicianId = workOrder.assigned_technician_id;
  }

  if (technicianId) validTechnician(technicianId);
  const status = scheduledAt && technicianId ? 'AGENDADA' : 'PENDIENTE_AGENDAR';
  db.prepare(`INSERT INTO appointments
    (id,client_id,work_order_id,assigned_technician_id,scheduled_at,status,notes,created_by_id)
    VALUES (?,?,?,?,?,?,?,?)`).run(
    uid(),
    clientId,
    workOrderId,
    technicianId,
    scheduledAt,
    status,
    optionalText(data, 'notes'),
    user.id,
  );
  refreshAppointment();
}

export async function updateAppointment(id: string, data: FormData) {
  await appointmentManager(id);
  db.prepare(`UPDATE appointments SET notes=?,updated_at=CURRENT_TIMESTAMP
    WHERE id=?`).run(optionalText(data, 'notes'), id);
  refreshAppointment(id);
}

export async function rescheduleAppointment(id: string, data: FormData) {
  const { user, appointment } = await appointmentManager(id);
  const scheduledAt = requiredText(data, 'scheduledAt');
  let technicianId = user.role === 'ADMIN'
    ? optionalText(data, 'technicianId') ?? appointment.assigned_technician_id
    : user.id;

  if (appointment.work_order_id) {
    const order = db.prepare('SELECT assigned_technician_id FROM work_orders WHERE id=?')
      .get(appointment.work_order_id) as { assigned_technician_id: string };
    assertCanScheduleVisit(user.role, user.id, order.assigned_technician_id);
    technicianId = order.assigned_technician_id;
  }
  if (!technicianId) throw new Error('TECHNICIAN_REQUIRED');
  validTechnician(technicianId);

  db.prepare(`UPDATE appointments SET assigned_technician_id=?,scheduled_at=?,
    status='REAGENDADA',cancellation_reason=NULL,updated_at=CURRENT_TIMESTAMP
    WHERE id=?`).run(technicianId, scheduledAt, id);
  refreshAppointment(id);
}

export async function cancelAppointment(id: string, data: FormData) {
  await appointmentManager(id);
  db.prepare(`UPDATE appointments SET status='CANCELADA',cancellation_reason=?,
    updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(
    requiredText(data, 'reason'),
    id,
  );
  refreshAppointment(id);
}
