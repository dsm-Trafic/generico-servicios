import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db, type AppUser } from './db';

const COOKIE = 'generico_session';
const secret = process.env.BETTER_AUTH_SECRET ?? 'local-development-secret';

function sign(id: string) { return createHmac('sha256', secret).update(id).digest('hex'); }

export async function setSession(userId: string) {
  (await cookies()).set(COOKIE, `${userId}.${sign(userId)}`, { httpOnly: true, sameSite: 'lax', secure: false, path: '/', maxAge: 60 * 60 * 12 });
}

export async function clearSession() { (await cookies()).delete(COOKIE); }

export async function currentUser(): Promise<AppUser | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [id, signature] = raw.split('.');
  if (!id || !signature || !/^[a-f0-9]{64}$/.test(signature) || !timingSafeEqual(Buffer.from(signature), Buffer.from(sign(id)))) return null;
  return (db.prepare('SELECT id,name,email,role FROM users WHERE id=?').get(id) as AppUser | undefined) ?? null;
}

export async function requireUser() { const user = await currentUser(); if (!user) redirect('/login'); return user; }
export function assertAdmin(user: Pick<AppUser, 'role'>) { if (user.role !== 'ADMIN') throw new Error('FORBIDDEN'); }
