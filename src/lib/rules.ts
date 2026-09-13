export type AppRole = 'ADMIN' | 'TECNICO';

export function assertCanEditWorkOrder(
  user: { id: string; role: AppRole },
  order: { assignedTechnicianId: string | null; status: string },
) {
  if (order.status === 'TERMINADO') throw new Error('WORK_ORDER_CLOSED');
  if (user.role !== 'ADMIN' && order.assignedTechnicianId !== user.id) {
    throw new Error('FORBIDDEN');
  }
}

export function assertCanScheduleVisit(
  role: AppRole,
  userId: string,
  assignedTechnicianId: string,
) {
  if (role !== 'ADMIN' && userId !== assignedTechnicianId) {
    throw new Error('FORBIDDEN');
  }
}

export function assertCanCompleteVisit(
  role: AppRole,
  userId: string,
  assignedTechnicianId: string,
) {
  if (role !== 'TECNICO') throw new Error('TECHNICIAN_REQUIRED');
  if (userId !== assignedTechnicianId) throw new Error('FORBIDDEN');
}

export function assertCanRecordPayment(
  role: AppRole,
  userId: string,
  assignedTechnicianId: string,
) {
  assertCanCompleteVisit(role, userId, assignedTechnicianId);
}

export function assertAssignmentChangeAllowed(
  hasCompletedVisits: boolean,
  currentTechnicianId: string,
  nextTechnicianId: string,
) {
  if (hasCompletedVisits && currentTechnicianId !== nextTechnicianId) {
    throw new Error('TECHNICIAN_LOCKED');
  }
}

export function assertWorkOrderTerms(
  totalCents: number | null,
  collectionMode: string | null,
  plannedInstallments: number | null,
) {
  if (!totalCents || totalCents <= 0 || !collectionMode) {
    throw new Error('WORK_ORDER_TERMS_REQUIRED');
  }
  if (!['CONTADO', 'FINANCIADO', 'DEUDA_ABIERTA'].includes(collectionMode)) {
    throw new Error('INVALID_COLLECTION_MODE');
  }
  if (
    plannedInstallments !== null &&
    (!Number.isSafeInteger(plannedInstallments) || plannedInstallments < 1)
  ) {
    throw new Error('INVALID_INSTALLMENTS');
  }
}

export function remainingBalance(totalCents: number, payments: number[]) {
  const applied = payments.reduce((sum, value) => sum + value, 0);
  if (applied > totalCents) throw new Error('BALANCE_EXCEEDED');
  return totalCents - applied;
}

export function assertMovementAllowed(
  totalCents: number,
  alreadyApplied: number,
  amountCents: number,
) {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    throw new Error('INVALID_AMOUNT');
  }
  if (alreadyApplied + amountCents > totalCents) {
    throw new Error('BALANCE_EXCEEDED');
  }
}
