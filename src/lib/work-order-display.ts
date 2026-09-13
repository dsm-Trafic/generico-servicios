export type WorkOrderStatus = 'PENDIENTE' | 'EN_PROCESO' | 'TERMINADO';
export type StatusTone = 'pending' | 'active' | 'complete';

const statusMap: Record<
  WorkOrderStatus,
  { label: string; tone: StatusTone }
> = {
  PENDIENTE: { label: 'Pendiente', tone: 'pending' },
  EN_PROCESO: { label: 'En proceso', tone: 'active' },
  TERMINADO: { label: 'Terminado', tone: 'complete' },
};

export function statusDisplay(status: WorkOrderStatus) {
  return statusMap[status];
}

export function workOrderTypeLabel(type: string) {
  const labels: Record<string, string> = {
    TRABAJO_GENERAL: 'Trabajo general',
    URGENCIA: 'Urgencia',
    MANTENIMIENTO: 'Mantenimiento',
    SOLICITUD_PRESUPUESTO: 'Solicitud de presupuesto',
  };
  return labels[type] ?? type;
}
