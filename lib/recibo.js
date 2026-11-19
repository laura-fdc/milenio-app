import 'server-only';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { CLUB } from './club';

const ORANGE = rgb(0.95, 0.55, 0.16);
const INK = rgb(0.12, 0.1, 0.08);
const MUTED = rgb(0.48, 0.43, 0.38);
const LINE = rgb(0.94, 0.89, 0.81);

// Helvetica estándar solo admite WinAnsi: se limpian caracteres no representables.
const safe = (s) => String(s ?? '').replace(/[^\x20-\x7E -ÿ€]/g, '');
const eur = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n || 0);
const fdate = (iso) => (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : iso || '');

export async function renderDoc(doc) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${doc.tipo === 'factura' ? 'Factura' : 'Justificante'} ${doc.numero}`);
  pdf.setAuthor(CLUB.nombre);
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28, M = 48;
  const text = (s, x, y, o = {}) => page.drawText(safe(s), { x, y, size: o.size || 10, font: o.bold ? bold : font, color: o.color || INK });
  const right = (s, xr, y, o = {}) => {
    const f = o.bold ? bold : font, size = o.size || 10;
    text(s, xr - f.widthOfTextAtSize(safe(s), size), y, o);
  };
  const wrap = (s, x, y, maxW, o = {}) => {
    const f = o.bold ? bold : font, size = o.size || 10;
    const words = safe(s).split(/\s+/); let line = '', yy = y;
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (f.widthOfTextAtSize(t, size) > maxW && line) { text(line, x, yy, o); yy -= size + 4; line = w; } else line = t;
    }
    if (line) text(line, x, yy, o);
    return yy - (size + 4);
  };

  // Cabecera
  page.drawRectangle({ x: 0, y: 841.89 - 70, width: W, height: 70, color: ORANGE });
  text(CLUB.nombre, M, 841.89 - 42, { size: 20, bold: true, color: rgb(1, 1, 1) });
  text(`NIF ${CLUB.nif}`, M, 841.89 - 58, { size: 9, color: rgb(1, 1, 1) });
  right(doc.tipo === 'factura' ? 'FACTURA' : 'JUSTIFICANTE DE PAGO', W - M, 841.89 - 42, { size: 14, bold: true, color: rgb(1, 1, 1) });

  let y = 841.89 - 100;
  text(CLUB.direccion, M, y, { size: 9, color: MUTED });
  text(`${CLUB.cp} ${CLUB.localidad} (${CLUB.provincia}) · ${CLUB.email}`, M, y - 12, { size: 9, color: MUTED });
  right(`Nº ${doc.numero}`, W - M, y, { bold: true, size: 11 });
  right(`Fecha: ${fdate(doc.fecha)}`, W - M, y - 14, { size: 10 });

  // Datos del deportista y pagador
  y -= 46;
  const box = (title, rows, x, w) => {
    page.drawRectangle({ x, y: y - 14 - rows.length * 15, width: w, height: 28 + rows.length * 15, borderColor: LINE, borderWidth: 1 });
    text(title, x + 10, y, { bold: true, size: 9, color: ORANGE });
    const maxW = w - 100;
    rows.forEach(([k, v], i) => {
      text(k, x + 10, y - 16 - i * 15, { size: 9, color: MUTED });
      let s = safe(v || '—'), size = 10;
      while (font.widthOfTextAtSize(s, size) > maxW && size > 7.5) size -= 0.5;
      while (font.widthOfTextAtSize(s, size) > maxW && s.length > 4) s = s.replace(/\.\.\.$/, '').slice(0, -1) + '...';
      text(s, x + 90, y - 16 - i * 15, { size });
    });
  };
  const half = (W - 2 * M - 12) / 2;
  box('DEPORTISTA', [['Nombre', doc.socio.nombre], ['ID socio', doc.socio.id], ['DNI', doc.socio.dni], ['F. nacimiento', fdate(doc.socio.nacimiento)]], M, half);
  if (doc.pagador?.nombre) {
    box(doc.tipo === 'factura' ? 'FACTURADO A' : 'PAGADOR', [['Nombre', doc.pagador.nombre], ['DNI / NIF', doc.pagador.dni], ['Dirección', doc.pagador.direccion]], M + half + 12, half);
  }

  // Tabla de pagos
  y -= 100;
  const cols = [M, M + 72, M + 300, W - M];
  page.drawRectangle({ x: M, y: y - 6, width: W - 2 * M, height: 22, color: rgb(1, 0.95, 0.87) });
  text('FECHA', cols[0] + 6, y, { bold: true, size: 9, color: MUTED });
  text('CONCEPTO', cols[1], y, { bold: true, size: 9, color: MUTED });
  text('PERIODO', cols[2], y, { bold: true, size: 9, color: MUTED });
  right('IMPORTE', cols[3] - 6, y, { bold: true, size: 9, color: MUTED });
  y -= 22;
  for (const l of doc.lineas) {
    text(fdate(l.fecha), cols[0] + 6, y);
    text(l.concepto.slice(0, 42) + (l.metodo ? ` (${l.metodo})` : '').slice(0, 20), cols[1], y);
    text((l.periodo || '').slice(0, 28), cols[2], y);
    right(eur(l.importe), cols[3] - 6, y);
    page.drawLine({ start: { x: M, y: y - 6 }, end: { x: W - M, y: y - 6 }, thickness: 0.6, color: LINE });
    y -= 20;
    if (y < 220) break; // límite de una página
  }

  // Totales
  y -= 6;
  if (doc.tipo === 'factura') {
    right(`Base imponible: ${eur(doc.total)}`, W - M - 6, y); y -= 15;
    right('IVA (exento): 0,00 €', W - M - 6, y); y -= 18;
  }
  right(`TOTAL: ${eur(doc.total)}`, W - M - 6, y, { bold: true, size: 13 });
  y -= 36;

  if (doc.tipo === 'factura') {
    y = wrap(CLUB.exencionIva, M, y, W - 2 * M, { size: 9, color: MUTED });
  } else {
    const quien = doc.pagador?.nombre ? `${doc.pagador.nombre}${doc.pagador.dni ? ` (DNI ${doc.pagador.dni})` : ''}, en relación con el deportista ` : '';
    y = wrap(
      `${CLUB.nombre}, con NIF ${CLUB.nif}, certifica que ${quien}${doc.socio.nombre}${doc.socio.dni ? `, con DNI ${doc.socio.dni}` : ''}${doc.socio.nacimiento ? ` y fecha de nacimiento ${fdate(doc.socio.nacimiento)}` : ''}, socio nº ${doc.socio.id}, ha abonado al club las cantidades detalladas, por un importe total de ${eur(doc.total)}, en concepto de cuotas y actividades deportivas.`,
      M, y, W - 2 * M, { size: 10 }
    );
  }
  if (doc.nota) { y -= 6; y = wrap(`Observaciones: ${doc.nota}`, M, y, W - 2 * M, { size: 9, color: MUTED }); }

  // Firma
  text(`En ${CLUB.localidad}, a ${fdate(doc.fecha)}`, M, 150);
  page.drawLine({ start: { x: W - M - 200, y: 110 }, end: { x: W - M, y: 110 }, thickness: 0.8, color: MUTED });
  text('Firma y sello del club', W - M - 200, 96, { size: 9, color: MUTED });
  text(`Documento generado por la app del club · ${doc.numero}`, M, 40, { size: 8, color: MUTED });

  return pdf.save();
}
