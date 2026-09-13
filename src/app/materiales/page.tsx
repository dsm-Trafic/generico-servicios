import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatUyu } from '@/lib/money';
import {
  createMaterial,
  deleteOrArchiveMaterial,
  restoreMaterial,
  updateMaterial,
} from '@/app/actions/catalog';

type Material = {
  id:string; name:string; model:string; supplier_id:string; supplier_name:string;
  cost_cents:number; status:string; usage_count:number;
};

export default async function MaterialsPage() {
  const user = await requireUser();
  if (user.role !== 'ADMIN') notFound();
  const suppliers=db.prepare("SELECT id,name FROM suppliers WHERE status='ACTIVO' ORDER BY name").all() as {id:string;name:string}[];
  const materials=db.prepare(`SELECT m.*,s.name supplier_name,
    (SELECT COUNT(*) FROM material_usages mu WHERE mu.material_id=m.id) usage_count
    FROM materials m JOIN suppliers s ON s.id=m.supplier_id ORDER BY m.status,m.name,m.model`).all() as Material[];

  return <AppShell><h1>Materiales</h1><div className="grid"><section className="card"><h2>Nuevo material</h2>{suppliers.length===0?<p>Primero crea un proveedor activo.</p>:<form action={createMaterial} className="form"><label>Material<input name="name" required/></label><label>Modelo<input name="model" required/></label><label>Proveedor<select name="supplierId" required>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Coste (UYU)<input name="cost" required/></label><button>Guardar material</button></form>}</section><section className="card"><h2>Catálogo</h2>{materials.length===0?<p className="muted">Aún no hay materiales.</p>:materials.map(m=><article className="record" key={m.id}><form action={updateMaterial.bind(null,m.id)} className="form"><label>Material<input name="name" defaultValue={m.name} required/></label><label>Modelo<input name="model" defaultValue={m.model} required/></label><label>Proveedor<select name="supplierId" defaultValue={m.supplier_id} required>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Coste (UYU)<input name="cost" defaultValue={String(m.cost_cents/100)} required/></label><p className="muted">{m.supplier_name} · {formatUyu(m.cost_cents)} · {m.usage_count} usos · {m.status}</p><button>Guardar cambios</button></form><form action={(m.status==='ACTIVO'?deleteOrArchiveMaterial:restoreMaterial).bind(null,m.id)}><button>{m.status==='ACTIVO'?(m.usage_count?'Archivar':'Eliminar'):'Restaurar'}</button></form></article>)}</section></div></AppShell>;
}
