// Catálogo de secciones, grupos y sesiones (según el Anexo Deportivo 2026/2027).
// Cada sesión tiene un id "dia-hora" y el número de día de la semana (0=domingo).

const S = (id, label) => {
  const dow = { dom: 0, lun: 1, mar: 2, mie: 3, jue: 4, vie: 5, sab: 6 }[id.slice(0, 3)];
  return { id, label, dow };
};

const TECNI = [
  S('lun-2105', 'Lunes 21:05'), S('mar-1500', 'Martes 15:00'), S('mie-1500', 'Miércoles 15:00'),
  S('mie-1600', 'Miércoles 16:00'), S('jue-1500', 'Jueves 15:00'), S('jue-1600', 'Jueves 16:00'),
  S('sab-1250', 'Sábado 12:50'), S('dom-0800', 'Domingo 8:00'), S('dom-0900', 'Domingo 9:00'),
  S('dom-2015', 'Domingo 20:15 (solo competición)'),
];

export const SECTIONS = [
  {
    id: 'escuelas', name: 'Escuelas', ico: '🏫', color: 'green',
    groups: [
      { id: 'escuela-hockey', name: 'Escuela de Hockey', attendance: true, price: '3 días/sem · 55€/mes',
        sessions: [S('lun-1815', 'Lunes 18:15'), S('jue-1700', 'Jueves 17:00'), S('sab-1045', 'Sábado 10:45')] },
      { id: 'escuela-artistico', name: 'Escuela de Artístico', attendance: true, price: '3 días/sem · 55€/mes',
        sessions: [S('lun-1815', 'Lunes 18:15'), S('mie-1700', 'Miércoles 17:00'), S('sab-1140', 'Sábado 11:40')] },
      { id: 'escuela-ninos', name: 'Iniciación · Niños', attendance: true, price: '1 día 35€ · 2 días 45€ · 3 días 55€',
        sessions: [S('lun-1815', 'Lunes 18:15'), S('mie-1700', 'Miércoles 17:00'), S('sab-1140', 'Sábado 11:40')] },
      { id: 'escuela-adultos', name: 'Iniciación · Adultos', attendance: true, price: '1 día/sem · 35€/mes',
        sessions: [S('sab-1140', 'Sábado 11:40')] },
    ],
  },
  {
    id: 'hockey', name: 'Hockey', ico: '🏒', color: 'orange',
    groups: [
      { id: 'hockey-senior', name: 'Sénior', price: '70€/mes', sessions: [] },
      { id: 'hockey-sub18', name: 'Sub-18', price: '70€/mes', sessions: [] },
      { id: 'hockey-sub16', name: 'Sub-16', price: '70€/mes', sessions: [] },
      { id: 'hockey-minis', name: 'Minis', price: '70€/mes', sessions: [] },
      { id: 'hockey-hobby', name: 'Hobby', price: '50€/mes', sessions: [] },
      { id: 'hockey-hobby-ini', name: 'Hobby iniciación', price: '28€/mes', sessions: [] },
    ],
  },
  {
    id: 'patinaje', name: 'Patinaje', ico: '⛸️', color: 'yellow',
    groups: [
      { id: 'patinaje-tecnificacion', name: 'Tecnificación', price: 'Desde 70€/mes (3 h/sem)', sessions: TECNI },
      { id: 'patinaje-competicion', name: 'Competición', price: 'Desde 70€/mes (3 h/sem)', sessions: TECNI },
      { id: 'ballet-mas15', name: 'Ballet OPEN +15', price: '70€/mes', sessions: [S('sab-1345', 'Sábado 13:45')] },
      { id: 'ballet-menos15', name: 'Ballet OPEN -15', price: '70€/mes', sessions: [S('sab-1345', 'Sábado 13:45')] },
    ],
  },
];

export const ALL_GROUPS = SECTIONS.flatMap((s) => s.groups.map((g) => ({ ...g, section: s })));

export function getGroup(gid) {
  return ALL_GROUPS.find((g) => g.id === gid) || null;
}

export function getSection(sid) {
  return SECTIONS.find((s) => s.id === sid) || null;
}

export function sessionLabel(gid, sid) {
  return getGroup(gid)?.sessions.find((s) => s.id === sid)?.label || sid;
}

// Categoría de hockey sugerida por edad (el root la puede cambiar).
export function suggestHockeyCategory(age) {
  if (age == null) return 'hockey-senior';
  if (age < 12) return 'hockey-minis';
  if (age < 16) return 'hockey-sub16';
  if (age < 18) return 'hockey-sub18';
  return 'hockey-senior';
}

export const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
