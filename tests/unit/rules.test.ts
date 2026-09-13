import { describe,expect,it } from 'vitest';
import {
  assertAssignmentChangeAllowed,
  assertCanCompleteVisit,
  assertCanEditWorkOrder,
  assertCanRecordPayment,
  assertCanScheduleVisit,
  assertMovementAllowed,
  assertWorkOrderTerms,
  remainingBalance,
} from '@/lib/rules';

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

 it('permite agendar a oficina y al técnico asignado',()=>{
  expect(()=>assertCanScheduleVisit('ADMIN','admin','t1')).not.toThrow();
  expect(()=>assertCanScheduleVisit('TECNICO','t1','t1')).not.toThrow();
  expect(()=>assertCanScheduleVisit('TECNICO','t2','t1')).toThrow('FORBIDDEN');
 });

 it('reserva el cierre y el cobro al técnico asignado',()=>{
  expect(()=>assertCanCompleteVisit('ADMIN','admin','t1')).toThrow('TECHNICIAN_REQUIRED');
  expect(()=>assertCanRecordPayment('TECNICO','t2','t1')).toThrow('FORBIDDEN');
  expect(()=>assertCanRecordPayment('TECNICO','t1','t1')).not.toThrow();
 });

 it('exige importe y modalidad pero permite financiación sin cuotas fijas',()=>{
  expect(()=>assertWorkOrderTerms(null,null,null)).toThrow('WORK_ORDER_TERMS_REQUIRED');
  expect(()=>assertWorkOrderTerms(120000,'FINANCIADO',null)).not.toThrow();
  expect(()=>assertWorkOrderTerms(120000,'FINANCIADO',0)).toThrow('INVALID_INSTALLMENTS');
 });

 it('bloquea el cambio de técnico después de la primera visita',()=>{
  expect(()=>assertAssignmentChangeAllowed(true,'t1','t2')).toThrow('TECHNICIAN_LOCKED');
  expect(()=>assertAssignmentChangeAllowed(false,'t1','t2')).not.toThrow();
 });
});
