import 'server-only';
import ExcelJS from 'exceljs';
import { getGroup, SECTIONS } from './catalog';
import { normId } from './db';

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
const DAYMAP = { LUNES: 'lun', MARTES: 'mar', MIERCOLES: 'mie', JUEVES: 'jue', VIERNES: 'vie', SABADO: 'sab', DOMINGO: 'dom' };
const cellText = (v) => {
  if (v == null) return '';
  if (typeof v === 'object') return v.text ?? v.result ?? (v.richText ? v.richText.map((r) => r.text).join('') : '');
  return String(v);
};

// Traduce una cabecera de columna ("LUNES 18:15", "ESCUELA PATINAJE ARTISTICO"...) a grupo + día.
function mapHeader(header, sheetName) {
  const h = norm(header);
  const sh = norm(sheetName);
  const all = (gid) => ({ gid, day: null });
  if (h.includes('ARTISTICO') && (h.includes('ESCUELA') || !h.match(/TECNI|COMPE/))) return all('escuela-artistico');
  if (h.includes('ESCUELA') && h.includes('HOCKEY')) return all('escuela-hockey');
  if (h.includes('ADULTO')) return all('escuela-adultos');
  const dw = Object.keys(DAYMAP).find((d) => h.includes(d));
  const tm = h.match(/(\d{1,2})[:.H](\d{2})/);
  if (dw && tm) {
    const sid = `${DAYMAP[dw]}-${tm[1].padStart(2, '0')}${tm[2]}`;
    // Por defecto los días sueltos son de la Escuela de Iniciación Niños; si el nombre de la hoja
    // indica otra escuela, se usa esa.
    const pref = sh.includes('HOCKEY') ? 'escuela-hockey' : sh.includes('ADULTO') ? 'escuela-adultos' : 'escuela-ninos';
    const order = [pref, ...SECTIONS[0].groups.map((g) => g.id).filter((g) => g !== pref)];
    for (const gid of order) if (getGroup(gid).sessions.some((s) => s.id === sid)) return { gid, day: sid };
  }
  return null;
}

export async function readWorkbook(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const targets = new Map(); // "gid|day" -> { gid, day, rows: Map(id -> {nombre, edad}) }
  const ignored = [];
  wb.eachSheet((ws) => {
    let headerRow = null;
    ws.eachRow((row, i) => {
      if (headerRow) return;
      if (row.values.some((v) => norm(cellText(v)).includes('ID SOCIO') || norm(cellText(v)) === 'ID')) headerRow = i;
    });
    if (!headerRow) { ignored.push(`Hoja "${ws.name.trim()}": sin cabecera "ID SOCIO"`); return; }
    const hdr = ws.getRow(headerRow).values.map(cellText);
    let cId = -1, cName = -1, cAge = -1;
    const marks = [];
    hdr.forEach((v, c) => {
      const n = norm(v);
      if (!n) return;
      if (n.includes('ID')) cId = c;
      else if (n.includes('NOMBRE')) cName = c;
      else if (n.includes('EDAD')) cAge = c;
      else {
        const t = mapHeader(v, ws.name);
        if (t) marks.push({ c, ...t });
        else ignored.push(`Hoja "${ws.name.trim()}": columna "${v}" no reconocida`);
      }
    });
    ws.eachRow((row, i) => {
      if (i <= headerRow) return;
      const id = normId(cellText(row.getCell(cId).value));
      if (!id || !/\d/.test(id)) return;
      const nombre = cellText(row.getCell(cName).value).trim();
      const edad = Number(cellText(row.getCell(cAge).value)) || null;
      for (const m of marks) {
        if (!cellText(row.getCell(m.c).value).trim()) continue;
        const k = `${m.gid}|${m.day || ''}`;
        if (!targets.has(k)) targets.set(k, { gid: m.gid, day: m.day, rows: new Map() });
        targets.get(k).rows.set(id, { nombre, edad });
      }
    });
  });
  return { targets: [...targets.values()], ignored };
}

// Calcula los cambios respecto a los socios actuales. Cada objetivo (grupo/día) del Excel
// se sincroniza: se añaden los que aparecen y se quitan de ese grupo/día los que ya no.
export function planImport(members, { targets }) {
  const byId = new Map(members.map((m) => [m.id, structuredClone(m)]));
  const created = [], touched = new Set();
  const summary = [];

  for (const t of targets) {
    const g = getGroup(t.gid);
    const allDays = g.sessions.map((s) => s.id);
    const added = [], removed = [];

    for (const [id, info] of t.rows) {
      let m = byId.get(id);
      if (!m) {
        m = { id, nombre: info.nombre, edad: info.edad, inscripciones: [], origen: 'excel' };
        byId.set(id, m);
        created.push({ id, nombre: info.nombre });
      } else if (!m.nacimiento && info.edad && m.edad !== info.edad) {
        m.edad = info.edad; touched.add(id);
      }
      if (!m.nombre && info.nombre) m.nombre = info.nombre;
      m.inscripciones ||= [];
      let e = m.inscripciones.find((x) => x.gid === t.gid);
      if (!e) { e = { gid: t.gid, dias: [] }; m.inscripciones.push(e); }
      const want = t.day ? [t.day] : allDays;
      const before = e.dias.length;
      e.dias = [...new Set([...e.dias, ...want])];
      if (e.dias.length !== before || !before) { added.push(m.nombre || id); touched.add(id); }
    }

    for (const m of byId.values()) {
      if (t.rows.has(m.id)) continue;
      const e = (m.inscripciones || []).find((x) => x.gid === t.gid);
      if (!e) continue;
      if (t.day) {
        if (!e.dias.includes(t.day)) continue;
        e.dias = e.dias.filter((d) => d !== t.day);
        if (!e.dias.length) m.inscripciones = m.inscripciones.filter((x) => x !== e);
      } else {
        m.inscripciones = m.inscripciones.filter((x) => x !== e);
      }
      removed.push(m.nombre || m.id);
      touched.add(m.id);
    }

    const dayLabel = t.day ? g.sessions.find((s) => s.id === t.day)?.label : 'Todos los días';
    summary.push({ group: g.name, day: dayLabel, total: t.rows.size, added, removed });
  }

  return { summary, created, toSave: [...touched].map((id) => byId.get(id)) };
}
