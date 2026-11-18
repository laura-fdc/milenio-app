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
