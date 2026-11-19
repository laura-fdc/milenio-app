import 'server-only';
import { kv } from './kv';

/* ---------- Utilidades ---------- */
export function normId(id) {
  // "mcp 36" / "MCP0036" / "MCP 0036" -> "MCP 0036"
  const s = String(id || '').trim().toUpperCase();
  const m = s.match(/^([A-Z]*)\s*0*(\d+)$/);
  if (!m) return s;
  return `${m[1] || 'MCP'} ${m[2].padStart(4, '0')}`;
}

export function ageOf(member, at = new Date()) {
  const n = member?.nacimiento;
  if (n && /^\d{4}-\d{2}-\d{2}$/.test(n)) {
    const [y, mo, d] = n.split('-').map(Number);
    let a = at.getFullYear() - y;
    if (at.getMonth() + 1 < mo || (at.getMonth() + 1 === mo && at.getDate() < d)) a--;
    return a;
  }
  return member?.edad ?? null;
}

const mkey = (id) => `member:${id}`;

/* ---------- Socios ---------- */
export async function listMembers() {
  const ids = await kv.smembers('members');
  if (!ids.length) return [];
  const out = [];
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const vals = await kv.mget(...chunk.map(mkey));
    vals.forEach((v) => v && out.push(v));
  }
  return out.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));
}

export async function getMember(id) {
  return kv.get(mkey(normId(id)));
}

export async function saveMember(m) {
  m.id = normId(m.id);
  m.updatedAt = new Date().toISOString();
  await kv.set(mkey(m.id), m);
  await kv.sadd('members', m.id);
  return m;
}

export async function deleteMember(id) {
  id = normId(id);
  await kv.del(mkey(id), `pdf:${id}`);
  await kv.srem('members', id);
}

export async function nextMemberId() {
  const ids = await kv.smembers('members');
  const max = ids.reduce((acc, id) => Math.max(acc, Number(String(id).replace(/\D/g, '')) || 0), 0);
  return normId(String(max + 1));
}

export function membersInGroup(members, gid) {
  return members.filter((m) => (m.inscripciones || []).some((i) => i.gid === gid));
}

export function enrollment(m, gid) {
  return (m.inscripciones || []).find((i) => i.gid === gid) || null;
}

/* ---------- PDF original ---------- */
export async function savePdf(id, base64) {
  await kv.set(`pdf:${normId(id)}`, base64);
}
export async function getPdf(id) {
  return kv.get(`pdf:${normId(id)}`);
}

/* ---------- Usuarios (entrenadoras / roots extra) ---------- */
export async function listUsers() {
  const h = (await kv.hgetall('users')) || {};
  return Object.entries(h).map(([email, v]) => ({ email, ...(typeof v === 'string' ? JSON.parse(v) : v) }));
}
export async function saveUser(email, data) {
  await kv.hset('users', { [email.toLowerCase().trim()]: data });
}
export async function deleteUser(email) {
  await kv.hdel('users', email.toLowerCase().trim());
}

/* ---------- Asistencia ---------- */
// Hash att:{gid}:{fecha} -> { [memberId]: 1 | 0 }
export async function getAttendance(gid, date) {
  return (await kv.hgetall(`att:${gid}:${date}`)) || {};
}
export async function setAttendance(gid, date, memberId, value) {
  const k = `att:${gid}:${date}`;
  if (value === null) await kv.hdel(k, memberId);
  else await kv.hset(k, { [memberId]: value ? 1 : 0 });
  await kv.sadd(`attdates:${gid}`, date);
}
export async function setAttendanceBulk(gid, date, map) {
  if (!Object.keys(map).length) return;
  await kv.hset(`att:${gid}:${date}`, map);
  await kv.sadd(`attdates:${gid}`, date);
}
export async function attendanceDates(gid) {
  return (await kv.smembers(`attdates:${gid}`)).sort();
}

// Marca una ausencia como ya notificada (devuelve false si ya lo estaba).
export async function markAbsenceNotified(gid, date, memberId) {
  const k = `attnotif:${gid}:${date}`;
  const h = (await kv.hgetall(k)) || {};
  if (h[memberId]) return false;
  await kv.hset(k, { [memberId]: new Date().toISOString() });
  return true;
}

/* ---------- Correos vinculados a un socio ---------- */
export function memberEmails(m) {
  return [...new Set([m?.mail, m?.tutor1?.mail, m?.tutor2?.mail].map((e) => (e || '').trim().toLowerCase()).filter((e) => e.includes('@')))];
}

/* ---------- Ausencias avisadas por la familia ---------- */
// Hash aus:{gid}:{fecha} -> { [memberId]: { motivo, por, at } }
export async function getAusencias(gid, date) {
  return (await kv.hgetall(`aus:${gid}:${date}`)) || {};
}
export async function setAusencia(gid, date, memberId, data) {
  if (data) {
    await kv.hset(`aus:${gid}:${date}`, { [memberId]: data });
    await kv.sadd(`ausm:${memberId}`, `${gid}|${date}`);
  } else {
    await kv.hdel(`aus:${gid}:${date}`, memberId);
    await kv.srem(`ausm:${memberId}`, `${gid}|${date}`);
  }
}
export async function ausenciasDeSocio(memberId) {
  const items = await kv.smembers(`ausm:${memberId}`);
  const out = [];
  for (const it of items) {
    const [gid, date] = it.split('|');
    const v = (await getAusencias(gid, date))[memberId];
    if (v) out.push({ gid, date, ...(typeof v === 'string' ? JSON.parse(v) : v) });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/* ---------- Suscripciones push (por cuenta de Google) ---------- */
export async function getPushSubs(email) {
  return (await kv.get(`push:${email}`)) || [];
}
export async function addPushSub(email, sub) {
  const list = (await getPushSubs(email)).filter((s) => s.endpoint !== sub.endpoint);
  list.push(sub);
  await kv.set(`push:${email}`, list.slice(-5));
}
export async function removePushSub(email, endpoint) {
  const list = (await getPushSubs(email)).filter((s) => s.endpoint !== endpoint);
  await kv.set(`push:${email}`, list);
}

/* ---------- Notificaciones dentro de la app (por cuenta) ---------- */
export async function addFeed(email, item) {
  const k = `feed:${email}`;
  const list = (await kv.get(k)) || [];
  list.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), at: new Date().toISOString(), ...item });
  await kv.set(k, list.slice(0, 50));
}
export async function getFeed(email) {
  return (await kv.get(`feed:${email}`)) || [];
}

/* ---------- Comunicados del club ---------- */
export async function addComunicado(c) {
  const list = (await kv.get('comunicados')) || [];
  const item = { id: Date.now().toString(36), at: new Date().toISOString(), ...c };
  list.unshift(item);
  await kv.set('comunicados', list.slice(0, 200));
  return item;
}
export async function listComunicados() {
  return (await kv.get('comunicados')) || [];
}
export async function deleteComunicado(id) {
  const list = (await kv.get('comunicados')) || [];
  await kv.set('comunicados', list.filter((c) => c.id !== id));
}

/* ---------- Pagos y documentos (justificantes / facturas) ---------- */
export async function getPagos(memberId) {
  return (await kv.get(`pagos:${normId(memberId)}`)) || [];
}
export async function savePagos(memberId, list) {
  await kv.set(`pagos:${normId(memberId)}`, list.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '')));
}
export async function getDocs(memberId) {
  return (await kv.get(`docs:${normId(memberId)}`)) || [];
}
export async function addDoc(memberId, doc) {
  const list = await getDocs(memberId);
  list.unshift(doc);
  await kv.set(`docs:${normId(memberId)}`, list);
}
export async function nextDocNumber(tipo, year) {
  const n = await kv.incr(`seq:${tipo}:${year}`);
  return `${tipo === 'factura' ? 'F' : 'J'}-${year}-${String(n).padStart(4, '0')}`;
}
