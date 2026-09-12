import { describe,expect,it } from 'vitest';
import { assertCanEditWorkOrder,assertMovementAllowed,remainingBalance } from '@/lib/rules';

describe('reglas de partes',()=>{
 it('impide que un técnico edite el parte de otro',()=>{
  expect(()=>assertCanEditWorkOrder({id:'t2',role:'TECNICO'},{assignedTechnicianId:'t1',status:'PENDIENTE'})).toThrow('FORBIDDEN');
 });
 it('impide editar un parte cerrado incluso a su técnico',()=>{
  expect(()=>assertCanEditWorkOrder({id:'t1',role:'TECNICO'},{assignedTechnicianId:'t1',status:'TERMINADO'})).toThrow('WORK_ORDER_CLOSED');
 });
 it('calcula el saldo y bloquea pagos excesivos',()=>{
  expect(remainingBalance(150000,[50000,50000])).toBe(50000);
  expect(()=>assertMovementAllowed(150000,100000,50001)).toThrow('BALANCE_EXCEEDED');
 });
});
