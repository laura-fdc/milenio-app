import { getGroup } from './catalog';

export const initials = (n) => (n || '?').split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

export const yesNo = (v) => (v === true ? 'Sí' : v === false ? 'No' : '—');

export function fmtDate(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function groupBadges(m) {
  return (m.inscripciones || []).map((i) => {
    const g = getGroup(i.gid);
    if (!g) return null;
    const days = i.dias?.length && i.dias.length < g.sessions.length
      ? ' · ' + i.dias.map((d) => g.sessions.find((s) => s.id === d)?.label.split(' ')[0].slice(0, 3)).join(', ')
      : '';
    return { gid: i.gid, label: `${g.name}${days}`, section: g.section.id };
  }).filter(Boolean);
}

// Columnas de la "tabla completa" (todos los datos de la ficha).
export const COLUMNS = [
  ['ID socio', (m) => m.id],
  ['Nombre', (m) => m.nombre],
  ['Edad', (m) => m.edadCalc ?? ''],
  ['DNI', (m) => m.dni],
  ['Nacimiento', (m) => fmtDate(m.nacimiento) || m.nacimientoTexto],
  ['Teléfono', (m) => m.telefono],
  ['Mail', (m) => m.mail],
  ['Domicilio', (m) => [m.domicilio, m.cp, m.localidad, m.provincia].filter(Boolean).join(', ')],
  ['Nacionalidad', (m) => m.nacionalidad],
  ['Tutor 1', (m) => m.tutor1?.nombre],
  ['Tel. tutor 1', (m) => m.tutor1?.telefono],
  ['Mail tutor 1', (m) => m.tutor1?.mail],
  ['Tutor 2', (m) => m.tutor2?.nombre],
  ['Tel. tutor 2', (m) => m.tutor2?.telefono],
  ['Días', (m) => m.diasTexto],
  ['Hermanos', (m) => yesNo(m.hermanos)],
  ['Imagen', (m) => yesNo(m.imagenTutor1 || m.imagenTutor2 ? true : m.imagenTutor1 === false ? false : null)],
  ['Difusión', (m) => (m.noDifusion ? 'No desea' : 'Sí')],
  ['Abonado LD', (m) => (m.abonado ? m.numAbonado || 'Sí' : yesNo(m.abonado))],
  ['Observaciones', (m) => m.observaciones],
];
