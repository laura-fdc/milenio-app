'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { currentUser, canSeeGroup, canSeeMember } from '@/lib/session';
import {
  getMember, saveMember, deleteMember, listMembers, normId, savePdf,
  setAttendance, setAttendanceBulk, saveUser, deleteUser, nextMemberId,
  memberEmails, getAusencias, setAusencia, markAbsenceNotified, addPushSub, removePushSub,
  addComunicado, deleteComunicado, listUsers, membersInGroup, enrollment,
  getPagos, savePagos, addDoc, nextDocNumber,
} from '@/lib/db';
import { getGroup, ALL_GROUPS, getSection } from '@/lib/catalog';
import { isIso, todayMadrid, dowOf, prettyDate } from '@/lib/dates';
import { parseFicha, imagesToPdf } from '@/lib/pdf';
import { readWorkbook, planImport } from '@/lib/excel';
import { notifyMember, notifyComunicado } from '@/lib/notify';
import { ocrFicha, visionConfigured } from '@/lib/ocr';
import { readPagosWorkbook } from '@/lib/pagos';

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
  const id = normId(memberId);
  await setAttendance(gid, date, id, value);
  if (value === false) {
    // Aviso a la familia (una sola vez por día), salvo que ya avisara ella de la ausencia.
    after(async () => {
      try {
        const aus = await getAusencias(gid, date);
        if (aus[id]) return;
        if (!(await markAbsenceNotified(gid, date, id))) return;
        const m = await getMember(id);
        if (!m) return;
        await notifyMember(m, {
          kind: 'ausencia',
          title: `${m.nombre.split(' ')[0]} no ha asistido a ${g.name}`,
          body: `${m.nombre} no ha asistido a ${g.name} el ${prettyDate(date).toLowerCase()}.\nSi ya lo sabías, no tienes que hacer nada. Puedes avisar de futuras ausencias desde la app.`,
          url: `/socios/${encodeURIComponent(id)}`,
        });
      } catch (e) { console.error('[aviso ausencia]', e); }
    });
  }
  return { ok: true };
}

export async function markAll(gid, date, ids, value) {
  const u = await currentUser();
  const g = getGroup(gid);
  if (!u || !g?.attendance || !canSeeGroup(u, gid) || !isIso(date)) throw new Error('Sin permiso');
  await setAttendanceBulk(gid, date, Object.fromEntries(ids.map((id) => [normId(id), value ? 1 : 0])));
  return { ok: true };
}

/* ---------- Avisos de la familia ---------- */
async function mustSeeMember(memberId) {
  const u = await currentUser();
  const m = await getMember(memberId);
  if (!u || !m || !canSeeMember(u, m) || !['root', 'familia'].includes(u.role)) throw new Error('Sin permiso');
  return { u, m };
}

export async function saveAvisosAction(memberId, prefs) {
  const { m } = await mustSeeMember(memberId);
  const vinculados = memberEmails(m);
  m.avisos = {
    app: Boolean(prefs.app),
    email: Boolean(prefs.email),
    emails: (prefs.emails || []).map((e) => String(e).toLowerCase()).filter((e) => vinculados.includes(e)),
  };
  await saveMember(m);
  revalidatePath(`/socios/${encodeURIComponent(m.id)}`);
  return { ok: true };
}

export async function subscribePushAction(sub) {
  const u = await currentUser();
  if (!u || u.role === 'none') throw new Error('Sin permiso');
  if (!sub?.endpoint || !String(sub.endpoint).startsWith('https://')) throw new Error('Suscripción no válida');
  await addPushSub(u.email, { endpoint: sub.endpoint, keys: sub.keys });
  return { ok: true };
}

export async function unsubscribePushAction(endpoint) {
  const u = await currentUser();
  if (u) await removePushSub(u.email, endpoint);
  return { ok: true };
}

export async function reportarAusenciaAction(memberId, gid, date, motivo) {
  const { u, m } = await mustSeeMember(memberId);
  const g = getGroup(gid);
  const e = enrollment(m, gid);
  if (!g || !e || !isIso(date)) return { error: 'Datos no válidos' };
  if (date < todayMadrid()) return { error: 'No se puede avisar de un día que ya ha pasado' };
  if (!g.sessions.some((s) => s.dow === dowOf(date) && e.dias.includes(s.id))) return { error: 'Ese día no tiene clase' };
  await setAusencia(gid, date, m.id, { motivo: String(motivo || '').slice(0, 200), por: u.email, at: new Date().toISOString() });
  revalidatePath(`/socios/${encodeURIComponent(m.id)}`);
  return { ok: true };
}

export async function cancelarAusenciaAction(memberId, gid, date) {
  const { m } = await mustSeeMember(memberId);
  if (!isIso(date) || date < todayMadrid()) return { error: 'Ya no se puede cancelar' };
  await setAusencia(gid, date, m.id, null);
  revalidatePath(`/socios/${encodeURIComponent(m.id)}`);
  return { ok: true };
}

/* ---------- Comunicados ---------- */
export async function comunicadoAction(fd) {
  const me = await mustRoot();
  const titulo = String(fd.get('titulo') || '').trim().slice(0, 120);
  const mensaje = String(fd.get('mensaje') || '').trim().slice(0, 3000);
  const fecha = String(fd.get('fecha') || '');
  let groups = fd.getAll('groups').filter((g) => VALID_GIDS.has(g));
  const todos = fd.get('todos') === '1';
  if (!titulo || !mensaje) return { error: 'Pon un título y un mensaje' };
  if (!todos && !groups.length) return { error: 'Elige a quién va dirigido' };
  if (todos) groups = [];

  const members = await listMembers();
  const dest = todos ? members : members.filter((m) => (m.inscripciones || []).some((i) => groups.includes(i.gid)));
  const coaches = (await listUsers()).filter((x) => x.role === 'entrenadora' && (todos || (x.groups || []).some((g) => groups.includes(g)))).map((x) => x.email);

  const c = await addComunicado({ titulo, mensaje, fecha: isIso(fecha) ? fecha : null, groups, todos, por: me.email });
  const body = (isIso(fecha) ? `📅 ${prettyDate(fecha)}\n` : '') + mensaje;
  const res = await notifyComunicado(dest, coaches, { title: `📢 ${titulo}`, body, url: '/' });
  revalidatePath('/', 'layout');
  return { ok: true, id: c.id, socios: dest.length, ...res };
}

export async function deleteComunicadoAction(fd) {
  await mustRoot();
  await deleteComunicado(String(fd.get('id')));
  revalidatePath('/', 'layout');
}

/* ---------- Pagos ---------- */
const money = (v) => Math.round(Number(String(v).replace(',', '.')) * 100) / 100;
const pid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export async function addPagoAction(memberId, fd) {
  await mustRoot();
  const m = await getMember(memberId);
  if (!m) return { error: 'Socio no encontrado' };
  const importe = money(fd.get('importe'));
  const fecha = String(fd.get('fecha') || '');
  const concepto = String(fd.get('concepto') || '').trim();
  if (!concepto || !isFinite(importe) || importe <= 0 || !isIso(fecha)) return { error: 'Revisa concepto, importe y fecha' };
  const list = await getPagos(m.id);
  list.push({ id: pid(), fecha, concepto, periodo: String(fd.get('periodo') || '').trim(), importe, metodo: String(fd.get('metodo') || '').trim() });
  await savePagos(m.id, list);
  revalidatePath(`/socios/${encodeURIComponent(m.id)}/pagos`);
  return { ok: true };
}

export async function deletePagoAction(memberId, pagoId) {
  await mustRoot();
  const list = await getPagos(memberId);
  await savePagos(memberId, list.filter((p) => p.id !== pagoId));
  revalidatePath(`/socios/${encodeURIComponent(normId(memberId))}/pagos`);
  return { ok: true };
}

export async function importPagosAction(fd) {
  await mustRoot();
  const file = fd.get('file');
  if (!file || typeof file === 'string') return { error: 'No se ha recibido el Excel' };
  try {
    const { rows, ignored } = await readPagosWorkbook(Buffer.from(await file.arrayBuffer()));
    const members = new Map((await listMembers()).map((m) => [m.id, m]));
    const byMember = new Map();
    const unknown = new Set();
    for (const r of rows) {
      if (!members.has(r.id)) { unknown.add(r.id); continue; }
      if (!byMember.has(r.id)) byMember.set(r.id, []);
      byMember.get(r.id).push(r);
    }
    let nuevos = 0, repetidos = 0, total = 0;
    const apply = fd.get('apply') === '1';
    for (const [id, list] of byMember) {
      const cur = await getPagos(id);
      const key = (p) => `${p.fecha}|${p.concepto.toLowerCase()}|${p.periodo.toLowerCase()}|${p.importe}`;
      const seen = new Set(cur.map(key));
      for (const r of list) {
        if (seen.has(key(r))) { repetidos++; continue; }
        seen.add(key(r)); nuevos++; total += r.importe;
        const { id: _socio, ...pago } = r;
        cur.push({ id: pid(), ...pago });
      }
      if (apply) await savePagos(id, cur);
    }
    if (apply) revalidatePath('/', 'layout');
    return { ok: true, applied: apply, socios: byMember.size, nuevos, repetidos, total: Math.round(total * 100) / 100, unknown: [...unknown], ignored };
  } catch (e) {
    return { error: 'No se pudo leer el Excel: ' + e.message };
  }
}

/* ---------- Justificantes y facturas ---------- */
export async function generarDocAction(memberId, fd) {
  const me = await mustRoot();
  const m = await getMember(memberId);
  if (!m) return { error: 'Socio no encontrado' };
  const tipo = fd.get('tipo') === 'factura' ? 'factura' : 'justificante';
  const ids = fd.getAll('pagos');
  const pagos = (await getPagos(m.id)).filter((p) => ids.includes(p.id));
  if (!pagos.length) return { error: 'Selecciona al menos un pago' };
  const pagador = {
    nombre: String(fd.get('pagadorNombre') || '').trim(),
    dni: String(fd.get('pagadorDni') || '').trim().toUpperCase(),
    direccion: String(fd.get('pagadorDireccion') || '').trim(),
  };
  if (tipo === 'factura' && (!pagador.nombre || !pagador.dni)) return { error: 'La factura necesita nombre y DNI/NIF de quien paga' };
  const fecha = todayMadrid();
  const numero = await nextDocNumber(tipo, fecha.slice(0, 4));
  const doc = {
    numero, tipo, fecha, por: me.email,
    socio: {
      id: m.id, nombre: String(fd.get('nombre') || m.nombre).trim(),
      dni: String(fd.get('dni') || m.dni || '').trim().toUpperCase(),
      nacimiento: String(fd.get('nacimiento') || m.nacimiento || ''),
    },
    pagador,
    lineas: pagos.map(({ fecha, concepto, periodo, importe, metodo }) => ({ fecha, concepto, periodo, importe, metodo })),
    total: Math.round(pagos.reduce((a, p) => a + p.importe, 0) * 100) / 100,
    nota: String(fd.get('nota') || '').trim().slice(0, 300),
  };
  await addDoc(m.id, doc);
  revalidatePath(`/socios/${encodeURIComponent(m.id)}/pagos`);
  return { ok: true, numero };
}

/* ---------- Fichas PDF ---------- */
export async function parsePdfAction(fd) {
  await mustRoot();
  const files = fd.getAll('file').filter((f) => f && typeof f !== 'string');
  const file = files[0];
  if (!file) return { error: 'No se ha recibido el archivo' };
  try {
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    let parsed = isPdf ? await parseFicha(new Uint8Array(await file.arrayBuffer())) : { fieldCount: 0, filled: 0, member: null };
    if (parsed.filled === 0) {
      if (!visionConfigured()) {
        if (!isPdf) return { error: 'Para leer fotos o fichas a mano hay que configurar GOOGLE_VISION_API_KEY en Vercel.' };
      } else {
        const ocr = await ocrFicha(await Promise.all(files.map(async (f) => ({
          bytes: Buffer.from(await f.arrayBuffer()), type: f.type || (/\.pdf$/i.test(f.name) ? 'application/pdf' : 'image/jpeg'),
        }))));
        parsed = { ...ocr, ocr: true };
      }
    }
    if (!parsed.member) parsed.member = {};
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

  const files = fd.getAll('file').filter((f) => f && typeof f !== 'string' && f.size);
  if (files.length) {
    const isPdf = files[0].type === 'application/pdf' || /\.pdf$/i.test(files[0].name);
    const bytes = isPdf
      ? Buffer.from(await files[0].arrayBuffer())
      : Buffer.from(await imagesToPdf(await Promise.all(files.map(async (f) => ({ bytes: new Uint8Array(await f.arrayBuffer()), type: f.type })))));
    if (bytes.length > 3_000_000) return { ok: true, id, warning: 'Ficha guardada, pero el archivo es demasiado grande para adjuntarlo (máx. 3 MB).' };
    await savePdf(id, bytes.toString('base64'));
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
