'use server';

import { redirect } from 'next/navigation';
import { db, verifyPassword } from '@/lib/db';
import { clearSession, setSession } from '@/lib/auth';
import { requiredText } from './form-data';

export async function loginAction(data: FormData) {
  const email = requiredText(data, 'email').toLowerCase();
  const password = requiredText(data, 'password');
  const user = db
    .prepare('SELECT id,password_hash FROM users WHERE email=?')
    .get(email) as { id: string; password_hash: string } | undefined;

  if (!user || !verifyPassword(password, user.password_hash)) {
    redirect('/login?error=1');
  }

  await setSession(user.id);
  redirect('/');
}

export async function logoutAction() {
  await clearSession();
  redirect('/login');
}
