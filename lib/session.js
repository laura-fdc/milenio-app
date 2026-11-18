import 'server-only';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listUsers, listMembers } from './db';

const rootEnv = () =>
  (process.env.ROOT_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

// Devuelve el usuario con su rol actual (se consulta en cada petición para que
// los cambios de permisos tengan efecto inmediato).
export async function currentUser() {
  const s = await auth();
  const email = s?.user?.email?.toLowerCase();
  if (!email) return null;
  const base = { email, name: s.user.name || email, image: s.user.image || null };

  if (rootEnv().includes(email)) return { ...base, role: 'root', groups: [] };

  const u = (await listUsers()).find((x) => x.email === email);
  if (u?.role === 'root') return { ...base, role: 'root', groups: [] };
  if (u?.role === 'entrenadora') return { ...base, role: 'entrenadora', groups: u.groups || [] };

  const members = await listMembers();
  const mine = members.filter((m) =>
    [m.mail, m.tutor1?.mail, m.tutor2?.mail].some((x) => x && x.toLowerCase().trim() === email)
  );
  if (mine.length) return { ...base, role: 'familia', groups: [], memberIds: mine.map((m) => m.id) };

  return { ...base, role: 'none' };
}

export async function requireUser(roles) {
  const u = await currentUser();
  if (!u) redirect('/login');
  if (u.role === 'none') redirect('/sin-acceso');
  if (roles && !roles.includes(u.role)) redirect('/');
  return u;
}

export function canSeeGroup(user, gid) {
  return user.role === 'root' || (user.role === 'entrenadora' && user.groups.includes(gid));
}

export function canSeeMember(user, m) {
  if (user.role === 'root') return true;
  if (user.role === 'familia') return user.memberIds.includes(m.id);
  if (user.role === 'entrenadora') return (m.inscripciones || []).some((i) => user.groups.includes(i.gid));
  return false;
}

// Datos que no debe ver quien no sea root.
export function redact(user, m) {
  if (user.role === 'root') return m;
  const { iban, titular, ...rest } = m;
  return rest;
}
