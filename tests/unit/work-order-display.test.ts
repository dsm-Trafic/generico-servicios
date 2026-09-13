import { expect, it } from 'vitest';
import { statusDisplay, type WorkOrderStatus } from '@/lib/work-order-display';

it.each([
  ['PENDIENTE', { label: 'Pendiente', tone: 'pending' }],
  ['EN_PROCESO', { label: 'En proceso', tone: 'active' }],
  ['TERMINADO', { label: 'Terminado', tone: 'complete' }],
] as const)('presenta el estado %s', (status, expected) => {
  expect(statusDisplay(status as WorkOrderStatus)).toEqual(expected);
});
