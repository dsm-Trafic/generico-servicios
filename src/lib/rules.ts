export function assertCanEditWorkOrder(user:{id:string;role:'ADMIN'|'TECNICO'}, order:{assignedTechnicianId:string|null;status:string}){
 if(order.status==='TERMINADO') throw new Error('WORK_ORDER_CLOSED');
 if(user.role!=='ADMIN' && order.assignedTechnicianId!==user.id) throw new Error('FORBIDDEN');
}

export function remainingBalance(totalCents:number, movements:number[]){
 const applied=movements.reduce((sum,value)=>sum+value,0);
 if(applied>totalCents) throw new Error('BALANCE_EXCEEDED');
 return totalCents-applied;
}

export function assertMovementAllowed(totalCents:number, alreadyApplied:number, amountCents:number){
 if(!Number.isSafeInteger(amountCents)||amountCents<=0) throw new Error('INVALID_AMOUNT');
 if(alreadyApplied+amountCents>totalCents) throw new Error('BALANCE_EXCEEDED');
}
