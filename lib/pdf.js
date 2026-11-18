import 'server-only';
import { PDFDocument, PDFCheckBox, PDFTextField, PDFName } from 'pdf-lib';
import { suggestHockeyCategory } from './catalog';

// Posición (página, x, y en puntos) de cada campo en la ficha "FIM Ficha Inscripción Milenio 2627".
// Se reconocen por posición, así funciona aunque se vuelva a exportar el PDF con otros nombres de campo.
const T = [
  // Página 1 — datos del deportista
  ['nombre', 0, 115, 708], ['dni', 0, 481, 708],
  ['nacimiento', 0, 123, 694], ['pais', 0, 302, 694], ['nacionalidad', 0, 463, 695],
  ['domicilio', 0, 72, 680], ['localidad', 0, 342, 680], ['provincia', 0, 485, 680],
  ['cp', 0, 91, 665], ['telefono', 0, 216, 665], ['mail', 0, 321, 665],
  // Tutores
  ['tutor1.nombre', 0, 115, 632], ['tutor1.dni', 0, 483, 632], ['tutor1.mail', 0, 46, 618], ['tutor1.telefono', 0, 411, 617],
  ['tutor2.nombre', 0, 113, 599], ['tutor2.dni', 0, 483, 600], ['tutor2.mail', 0, 45, 585], ['tutor2.telefono', 0, 411, 584],
  // Banco
  ['iban', 0, 147, 553], ['titular', 0, 131, 537],
  // Socio
  ['actualizarDatos', 0, 26, 502], ['actualizarDisciplina', 0, 26, 486], ['socioNuevo', 0, 417, 501],
  ['hermanosSi', 0, 470, 439], ['hermanosNo', 0, 525, 440],
  ['observaciones', 0, 19, 438], ['noDifusion', 0, 400, 404],
  ['abonadoSi', 0, 238, 386], ['abonadoNo', 0, 292, 386], ['numAbonado', 0, 437, 386],
  ['imagenTutor1', 0, 282, 172], ['imagenTutor2', 0, 548, 170],
  ['firmaTutor1', 0, 51, 126], ['firmaTutor2', 0, 334, 126],
  ['fechaDia', 0, 81, 70], ['fechaMes', 0, 130, 70], ['fechaAnio', 0, 253, 70],
  // Página 2 — Anexo deportivo
  ['anexoNombre', 1, 119, 699], ['anexoDni', 1, 446, 699],
  ['ninos.lun-1815', 1, 45, 635], ['ninos.mie-1700', 1, 45, 621], ['ninos.sab-1140', 1, 45, 606],
  ['escuelaArtistico', 1, 45, 557], ['escuelaHockey', 1, 44, 503],
  ['balletMas15', 1, 45, 433], ['balletMenos15', 1, 151, 433],
  ['adultos', 1, 295, 634],
  ['hockeyCategorias', 1, 294, 571], ['hockeyHobby', 1, 294, 557], ['hockeyHobbyIni', 1, 295, 543],
  ['tec.lun-2105', 1, 293, 488], ['tec.mar-1500', 1, 294, 474], ['tec.mie-1500', 1, 294, 460],
  ['tec.mie-1600', 1, 294, 446], ['tec.jue-1500', 1, 294, 432], ['tec.jue-1600', 1, 294, 417],
  ['tec.sab-1250', 1, 295, 402], ['tec.dom-0800', 1, 294, 389], ['tec.dom-0900', 1, 294, 374],
  ['tec.dom-2015', 1, 294, 360],
];

function toIsoDate(s) {
  const m = String(s || '').trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (!m) return '';
  let [, d, mo, y] = m;
  if (y.length === 2) y = (Number(y) > 30 ? '19' : '20') + y;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function ageFromIso(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const now = new Date();
  let a = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) a--;
  return a;
}

export async function parseFicha(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages = doc.getPages();

  // widget -> página
  const pageOf = new Map();
  pages.forEach((p, i) => {
    const annots = p.node.lookup(PDFName.of('Annots'));
    annots?.asArray?.().forEach((ref) => pageOf.set(ref.toString(), i));
  });

  const raw = {};
  let fieldCount = 0;
  for (const f of doc.getForm().getFields()) {
    fieldCount++;
    let value;
    if (f instanceof PDFCheckBox) value = f.isChecked();
    else if (f instanceof PDFTextField) value = (f.getText() || '').trim();
    else continue;
    for (const w of f.acroField.getWidgets()) {
      const r = w.getRectangle();
      const ref = doc.context.getObjectRef(w.dict)?.toString();
      const pi = pageOf.has(ref) ? pageOf.get(ref) : null;
      let best = null, bestD = 18;
      for (const [key, p, x, y] of T) {
        if (pi !== null && p !== pi) continue;
        const d = Math.hypot(r.x - x, r.y - y);
        if (d < bestD) { bestD = d; best = key; }
      }
      if (best && (raw[best] === undefined || raw[best] === '' || raw[best] === false)) raw[best] = value;
    }
  }

  const txt = (k) => (typeof raw[k] === 'string' ? raw[k] : '');
  const chk = (k) => raw[k] === true;
  const filled = Object.values(raw).filter((v) => v === true || (typeof v === 'string' && v)).length;

  const nacimiento = toIsoDate(txt('nacimiento'));
  const edad = ageFromIso(nacimiento);

  const inscripciones = [];
  const ninos = ['lun-1815', 'mie-1700', 'sab-1140'].filter((s) => chk(`ninos.${s}`));
  if (ninos.length) inscripciones.push({ gid: 'escuela-ninos', dias: ninos });
  if (chk('adultos')) inscripciones.push({ gid: 'escuela-adultos', dias: ['sab-1140'] });
  if (chk('escuelaArtistico')) inscripciones.push({ gid: 'escuela-artistico', dias: ['lun-1815', 'mie-1700', 'sab-1140'] });
  if (chk('escuelaHockey')) inscripciones.push({ gid: 'escuela-hockey', dias: ['lun-1815', 'jue-1700', 'sab-1045'] });
  if (chk('balletMas15')) inscripciones.push({ gid: 'ballet-mas15', dias: ['sab-1345'] });
  if (chk('balletMenos15')) inscripciones.push({ gid: 'ballet-menos15', dias: ['sab-1345'] });
  if (chk('hockeyCategorias')) inscripciones.push({ gid: suggestHockeyCategory(edad), dias: [], sugerido: true });
  if (chk('hockeyHobby')) inscripciones.push({ gid: 'hockey-hobby', dias: [] });
  if (chk('hockeyHobbyIni')) inscripciones.push({ gid: 'hockey-hobby-ini', dias: [] });
  const tec = ['lun-2105', 'mar-1500', 'mie-1500', 'mie-1600', 'jue-1500', 'jue-1600', 'sab-1250', 'dom-0800', 'dom-0900', 'dom-2015']
    .filter((s) => chk(`tec.${s}`));
  if (tec.length) {
    inscripciones.push({ gid: tec.includes('dom-2015') ? 'patinaje-competicion' : 'patinaje-tecnificacion', dias: tec, sugerido: true });
  }

  const fecha = [txt('fechaDia'), txt('fechaMes'), txt('fechaAnio')].filter(Boolean).join(' / ');

  return {
    fieldCount,
    filled,
    member: {
      nombre: txt('nombre') || txt('anexoNombre'),
      dni: (txt('dni') || txt('anexoDni')).toUpperCase(),
      nacimiento, nacimientoTexto: txt('nacimiento'), edad,
      pais: txt('pais'), nacionalidad: txt('nacionalidad'),
      domicilio: txt('domicilio'), localidad: txt('localidad'), provincia: txt('provincia'), cp: txt('cp'),
      telefono: txt('telefono'), mail: txt('mail').toLowerCase(),
      tutor1: { nombre: txt('tutor1.nombre'), dni: txt('tutor1.dni').toUpperCase(), mail: txt('tutor1.mail').toLowerCase(), telefono: txt('tutor1.telefono') },
      tutor2: { nombre: txt('tutor2.nombre'), dni: txt('tutor2.dni').toUpperCase(), mail: txt('tutor2.mail').toLowerCase(), telefono: txt('tutor2.telefono') },
      iban: txt('iban').replace(/\s+/g, ' ').toUpperCase(), titular: txt('titular'),
      actualizarDatos: chk('actualizarDatos'), actualizarDisciplina: chk('actualizarDisciplina'), socioNuevo: chk('socioNuevo'),
      hermanos: chk('hermanosSi') ? true : chk('hermanosNo') ? false : null,
      observaciones: txt('observaciones'),
      noDifusion: chk('noDifusion'),
      abonado: chk('abonadoSi') ? true : chk('abonadoNo') ? false : null,
      numAbonado: txt('numAbonado'),
      imagenTutor1: chk('imagenTutor1'), imagenTutor2: chk('imagenTutor2'),
      firmaTutor1: txt('firmaTutor1'), firmaTutor2: txt('firmaTutor2'),
      fechaFirma: fecha,
      conocio: '',
      inscripciones,
    },
  };
}
