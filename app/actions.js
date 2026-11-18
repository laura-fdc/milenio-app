'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { currentUser, canSeeGroup } from '@/lib/session';
import {
  getMember, saveMember, deleteMember, listMembers, normId, savePdf,
  setAttendance, setAttendanceBulk, saveUser, deleteUser, nextMemberId,
} from '@/lib/db';
import { getGroup, ALL_GROUPS } from '@/lib/catalog';
import { isIso } from '@/lib/dates';
import { parseFicha } from '@/lib/pdf';
import { readWorkbook, planImport } from '@/lib/excel';

async function mustRoot() {
  const u = await currentUser();
  if (u?.role !== 'root') throw new Error('Solo root puede hacer esto');
  return u;
}

/* ---------- Asistencia ---------- */
export async function toggleAttendance(gid, date, memberId, value) {
  const u = await currentUser();
  const g = getGroup(gid);
  if (!u || !g?.attendance || !canSeeGroup(u, gid) || !isIso(date)) throw new Error('Sin permiso');
  await setAttendance(gid, date, normId(memberId), value);
  return { ok: true };
}

export async function markAll(gid, date, ids, value) {
  const u = await currentUser();
  const g = getGroup(gid);
  if (!u || !g?.attendance || !canSeeGroup(u, gid) || !isIso(date)) throw new Error('Sin permiso');
  await setAttendanceBulk(gid, date, Object.fromEntries(ids.map((id) => [normId(id), value ? 1 : 0])));
  return { ok: true };
}

/* ---------- Fichas PDF ---------- */
export async function parsePdfAction(fd) {
  await mustRoot();
  const file = fd.get('file');
  if (!file || typeof file === 'string') return { error: 'No se ha recibido el PDF' };
  try {
    const parsed = await parseFicha(new Uint8Array(await file.arrayBuffer()));
    const members = await listMembers();
    const dni = parsed.member.dni;
    const match = dni ? members.find((m) => (m.dni || '').toUpperCase() === dni) : null;
    const byName = !match && parsed.member.nombre
      ? members.find((m) => (m.nombre || '').toLowerCase() === parsed.member.nombre.toLowerCase())
      : null;
    const existing = match || byName;
    return {
      ...parsed,
      existing: existing || null,
      suggestedId: existing?.id || (await nextMemberId()),
    };
  } catch (e) {
    return { error: 'No se pudo leer el PDF: ' + e.message };
  }
}

const VALID_GIDS = new Set(ALL_GROUPS.map((g) => g.id));

export async function saveMemberAction(fd) {
  await mustRoot();
  const data = JSON.parse(fd.get('data'));
  const originalId = fd.get('originalId') ? normId(fd.get('originalId')) : null;
  const id = normId(data.id);
  if (!id || !/\d/.test(id)) return { error: 'Falta el ID de socio' };
  if (!data.nombre?.trim()) return { error: 'Falta el nombre' };

  const prev = (originalId && (await getMember(originalId))) || (await getMember(id)) || {};
  const inscripciones = (data.inscripciones || [])
    .filter((i) => VALID_GIDS.has(i.gid))
    .map((i) => ({ gid: i.gid, dias: (i.dias || []).filter((d) => getGroup(i.gid).sessions.some((s) => s.id === d)) }));

  const m = { ...prev, ...data, id, inscripciones };
  delete m.sugerido;
  if (originalId && originalId !== id) await deleteMember(originalId);
  await saveMember(m);

  const file = fd.get('file');
  if (file && typeof file !== 'string' && file.size) {
    if (file.size > 3_000_000) return { ok: true, id, warning: 'Ficha guardada, pero el PDF es demasiado grande para adjuntarlo (máx. 3 MB).' };
    await savePdf(id, Buffer.from(await file.arrayBuffer()).toString('base64'));
    m.pdf = true;
    await saveMember(m);
  }
  revalidatePath('/', 'layout');
  return { ok: true, id };
}

export async function deleteMemberAction(id) {
  await mustRoot();
  await deleteMember(id);
  revalidatePath('/', 'layout');
  redirect('/socios');
}

/* ---------- Excel ---------- */
export async function excelAction(fd) {
  await mustRoot();
  const file = fd.get('file');
  if (!file || typeof file === 'string') return { error: 'No se ha recibido el Excel' };
  try {
    const wb = await readWorkbook(Buffer.from(await file.arrayBuffer()));
    if (!wb.targets.length) return { error: 'No se ha encontrado ningún grupo reconocible en el Excel.', ignored: wb.ignored };
    const members = await listMembers();
    const plan = planImport(members, wb);
    if (fd.get('apply') === '1') {
      for (const m of plan.toSave) await saveMember(m);
      revalidatePath('/', 'layout');
    }
    return { summary: plan.summary, created: plan.created, changed: plan.toSave.length, ignored: wb.ignored, applied: fd.get('apply') === '1' };
  } catch (e) {
    return { error: 'No se pudo leer el Excel: ' + e.message };
  }
}

/* ---------- Usuarios ---------- */
export async function saveUserAction(fd) {
  await mustRoot();
  const email = String(fd.get('email') || '').trim().toLowerCase();
  const role = fd.get('role');
  if (!email.includes('@') || !['root', 'entrenadora'].includes(role)) return;
  const groups = fd.getAll('groups').filter((g) => VALID_GIDS.has(g));
  await saveUser(email, { role, groups, name: String(fd.get('name') || '') });
  revalidatePath('/gestion/usuarios');
}

export async function deleteUserAction(fd) {
  const me = await mustRoot();
  const email = String(fd.get('email') || '');
  if (email === me.email) return;
  await deleteUser(email);
  revalidatePath('/gestion/usuarios');
}
