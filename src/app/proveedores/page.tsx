import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  createSupplier,
  deleteOrArchiveSupplier,
  restoreSupplier,
  updateSupplier,
} from '@/app/actions/catalog';

type Supplier = {
  id: string; name: string; phone: string | null; email: string | null;
  notes: string | null; status: string; material_count: number;
};

export default async function SuppliersPage() {
  const user = await requireUser();
  if (user.role !== 'ADMIN') notFound();
  const suppliers = db.prepare(`SELECT s.*,
    (SELECT COUNT(*) FROM materials m WHERE m.supplier_id=s.id) material_count
    FROM suppliers s ORDER BY s.status,s.name`).all() as Supplier[];

  return <AppShell><h1>Proveedores</h1><div className="grid"><section className="card"><h2>Nuevo proveedor</h2><form action={createSupplier} className="form"><label>Nombre<input name="name" required/></label><label>Teléfono<input name="phone"/></label><label>Correo<input name="email" type="email"/></label><label>Notas<textarea name="notes"/></label><button>Guardar proveedor</button></form></section><section className="card"><h2>Listado</h2>{suppliers.length===0?<p className="muted">Aún no hay proveedores.</p>:suppliers.map(s=><article className="record" key={s.id}><form action={updateSupplier.bind(null,s.id)} className="form"><label>Nombre<input name="name" defaultValue={s.name} required/></label><label>Teléfono<input name="phone" defaultValue={s.phone??''}/></label><label>Correo<input name="email" type="email" defaultValue={s.email??''}/></label><label>Notas<textarea name="notes" defaultValue={s.notes??''}/></label><p className="muted">{s.material_count} materiales · {s.status}</p><button>Guardar cambios</button></form><form action={(s.status==='ACTIVO'?deleteOrArchiveSupplier:restoreSupplier).bind(null,s.id)}><button>{s.status==='ACTIVO'?(s.material_count?'Archivar':'Eliminar'):'Restaurar'}</button></form></article>)}</section></div></AppShell>;
}
