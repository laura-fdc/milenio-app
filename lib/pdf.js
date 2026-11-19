import 'server-only';
import { PDFDocument, PDFCheckBox, PDFTextField, PDFName } from 'pdf-lib';
import { suggestHockeyCategory } from './catalog';
import { FIELDS } from './fichaTemplate';

export function toIsoDate(s) {
  const m = String(s || '').trim().replace(/\s+/g, '').match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (!m) return '';
  let [, d, mo, y] = m;
  if (y.length === 2) y = (Number(y) > 30 ? '19' : '20') + y;
  if (Number(mo) > 12 || Number(d) > 31) return '';
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

// Convierte los valores crudos (clave de plantilla -> texto o true/false) en un socio.
export function buildMember(raw) {
  const txt = (k) => (typeof raw[k] === 'string' ? raw[k].trim() : '');
  const chk = (k) => raw[k] === true;
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
  const mail = (k) => txt(k).toLowerCase().replace(/\s+/g, '');

  return {
    nombre: txt('nombre') || txt('anexoNombre'),
    dni: (txt('dni') || txt('anexoDni')).toUpperCase().replace(/\s+/g, ''),
    nacimiento, nacimientoTexto: txt('nacimiento'), edad,
    pais: txt('pais'), nacionalidad: txt('nacionalidad'),
    domicilio: txt('domicilio'), localidad: txt('localidad'), provincia: txt('provincia'), cp: txt('cp'),
    telefono: txt('telefono'), mail: mail('mail'),
    tutor1: { nombre: txt('tutor1.nombre'), dni: txt('tutor1.dni').toUpperCase(), mail: mail('tutor1.mail'), telefono: txt('tutor1.telefono') },
    tutor2: { nombre: txt('tutor2.nombre'), dni: txt('tutor2.dni').toUpperCase(), mail: mail('tutor2.mail'), telefono: txt('tutor2.telefono') },
    iban: txt('iban').replace(/\s+/g, ' ').toUpperCase(), titular: txt('titular'),
    actualizarDatos: chk('actualizarDatos'), actualizarDisciplina: chk('actualizarDisciplina'), socioNuevo: chk('socioNuevo'),
    hermanos: chk('hermanosSi') ? true : chk('hermanosNo') ? false : null,
    observaciones: txt('observaciones'),
    noDifusion: chk('noDifusion'),
    abonado: chk('abonadoSi') ? true : chk('abonadoNo') ? false : null,
    numAbonado: txt('numAbonado'),
    imagenTutor1: chk('imagenTutor1'), imagenTutor2: chk('imagenTutor2'),
    firmaTutor1: txt('firmaTutor1'), firmaTutor2: txt('firmaTutor2'),
    fechaFirma: [txt('fechaDia'), txt('fechaMes'), txt('fechaAnio')].filter(Boolean).join(' / '),
    conocio: '',
    inscripciones,
  };
}

// Lee una ficha PDF rellenable (campos de formulario), reconociéndolos por posición.
export async function parseFicha(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
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
      for (const [key, p, x, y] of FIELDS) {
        if (pi !== null && p !== pi) continue;
        const d = Math.hypot(r.x - x, r.y - y);
        if (d < bestD) { bestD = d; best = key; }
      }
      if (best && (raw[best] === undefined || raw[best] === '' || raw[best] === false)) raw[best] = value;
    }
  }
  const filled = Object.values(raw).filter((v) => v === true || (typeof v === 'string' && v)).length;
  return { fieldCount, filled, member: buildMember(raw) };
}

