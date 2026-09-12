'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db, uid, verifyPassword } from '@/lib/db';
import { assertAdmin, clearSession, requireUser, setSession } from '@/lib/auth';
import { toCents } from '@/lib/money';
import { assertCanEditWorkOrder, assertMovementAllowed } from '@/lib/rules';

const text = (data: FormData, key: string) => String(data.get(key) ?? '').trim();

export async function loginAction(data: FormData) {
  const email = text(data, 'email').toLowerCase();
  const password = text(data, 'password');
  const user = db.prepare('SELECT id,password_hash FROM users WHERE email=?').get(email) as {id:string;password_hash:string}|undefined;
  if (!user || !verifyPassword(password, user.password_hash)) redirect('/login?error=1');
  await setSession(user.id);
  redirect('/');
}

export async function logoutAction() { await clearSession(); redirect('/login'); }

export async function createClient(data: FormData) {
  await requireUser();
  const name = text(data, 'name'); const phone = text(data, 'phone');
  if (!name || !phone) throw new Error('CLIENT_REQUIRED_FIELDS');
  const duplicate=db.prepare('SELECT id FROM clients WHERE lower(name)=lower(?) AND phone=?').get(name,phone);
  if(duplicate) throw new Error('CLIENT_ALREADY_EXISTS');
  db.prepare('INSERT INTO clients (id,name,phone,email,address) VALUES (?,?,?,?,?)')
    .run(uid(), name, phone, text(data,'email') || null, text(data,'address') || null);
  revalidatePath('/clientes');
}

export async function createWorkOrder(data: FormData) {
  const user = await requireUser();
  const clientId = text(data,'clientId'); const description = text(data,'description');
  if (!clientId || !description) throw new Error('WORK_ORDER_REQUIRED_FIELDS');
  const assigned = user.role === 'ADMIN' ? (text(data,'technicianId') || null) : user.id;
  db.prepare(`INSERT INTO work_orders
    (id,client_id,assigned_technician_id,created_by_id,type,status,work_date,description,total_cents)
    VALUES (?,?,?,?,?,'PENDIENTE',?,?,?)`)
    .run(uid(), clientId, assigned, user.id, text(data,'type'), text(data,'workDate'), description, toCents(text(data,'total') || '0'));
  revalidatePath('/partes');
}

function editableOrder(id: string, user: {id:string;role:string}) {
  const order = db.prepare('SELECT * FROM work_orders WHERE id=?').get(id) as {assigned_technician_id:string|null;status:string}|undefined;
  if (!order) throw new Error('NOT_FOUND');
  assertCanEditWorkOrder({id:user.id,role:user.role as 'ADMIN'|'TECNICO'},{assignedTechnicianId:order.assigned_technician_id,status:order.status});
  return order;
}

export async function startWorkOrder(id: string) {
  const user = await requireUser(); editableOrder(id,user);
  db.prepare("UPDATE work_orders SET status='EN_CURSO',started_at=? WHERE id=? AND status='PENDIENTE'").run(new Date().toISOString(),id);
  revalidatePath(`/partes/${id}`);
}

export async function completeWorkOrder(id: string, data: FormData) {
  const user = await requireUser(); const order = editableOrder(id,user);
  if (order.status !== 'EN_CURSO') throw new Error('START_TIME_REQUIRED');
  const duration = Number(text(data,'durationMinutes') || 0);
  db.prepare("UPDATE work_orders SET status='TERMINADO',closed_at=?,duration_minutes=? WHERE id=?").run(new Date().toISOString(),duration || null,id);
  revalidatePath(`/partes/${id}`);
}

export async function addMaterial(id: string, data: FormData) {
  const user = await requireUser(); editableOrder(id,user);
  const name=text(data,'name'); const quantity=Number(text(data,'quantity'));
  if (!name || !Number.isInteger(quantity) || quantity < 1) throw new Error('INVALID_MATERIAL');
  db.prepare('INSERT INTO materials (id,work_order_id,name,quantity) VALUES (?,?,?,?)').run(uid(),id,name,quantity);
  revalidatePath(`/partes/${id}`);
}

export async function addMovement(recordedOnId: string, data: FormData) {
  const user = await requireUser();
  const appliedToId=text(data,'appliedToId') || recordedOnId;
  const source=db.prepare('SELECT client_id FROM work_orders WHERE id=?').get(recordedOnId) as {client_id:string}|undefined;
  const target=db.prepare('SELECT client_id,total_cents FROM work_orders WHERE id=?').get(appliedToId) as {client_id:string;total_cents:number}|undefined;
  if (!source || !target || source.client_id !== target.client_id) throw new Error('INVALID_TARGET');
  const amount=toCents(text(data,'amount')); const paid=(db.prepare('SELECT COALESCE(SUM(amount_cents),0) total FROM financial_movements WHERE applied_to_id=?').get(appliedToId) as {total:number}).total;
  assertMovementAllowed(target.total_cents,paid,amount);
  const kind=text(data,'kind'); const method=kind==='PAGO'?text(data,'paymentMethod'):null;
  const installments=kind==='FINANCIACION'?Number(text(data,'installmentCount')):null;
  if (kind==='PAGO' && !method) throw new Error('PAYMENT_METHOD_REQUIRED');
  if (kind==='FINANCIACION' && (!Number.isInteger(installments)||!installments||installments<1)) throw new Error('INSTALLMENTS_REQUIRED');
  db.prepare(`INSERT INTO financial_movements
    (id,recorded_on_id,applied_to_id,kind,amount_cents,payment_method,installment_count,created_by_id)
    VALUES (?,?,?,?,?,?,?,?)`).run(uid(),recordedOnId,appliedToId,kind,amount,method,installments,user.id);
  revalidatePath(`/partes/${recordedOnId}`);
}

export async function createBudget(workOrderId: string, data: FormData) {
  const user=await requireUser(); assertAdmin(user);
  const order=db.prepare('SELECT type FROM work_orders WHERE id=?').get(workOrderId) as {type:string}|undefined;
  if (!order || order.type !== 'VISITA_PRESUPUESTO') throw new Error('VISIT_REQUIRED');
  const concept=text(data,'concept'); const quantity=Number(text(data,'quantity')); const unit=toCents(text(data,'unitPrice'));
  if (!concept || !Number.isInteger(quantity) || quantity<1) throw new Error('INVALID_BUDGET');
  const budgetId=uid();
  db.transaction(() => {
    db.prepare('INSERT INTO budgets (id,work_order_id,total_cents) VALUES (?,?,?)').run(budgetId,workOrderId,quantity*unit);
    db.prepare('INSERT INTO budget_lines (id,budget_id,concept,quantity,unit_price_cents) VALUES (?,?,?,?,?)').run(uid(),budgetId,concept,quantity,unit);
  })();
  revalidatePath(`/partes/${workOrderId}`);
}
