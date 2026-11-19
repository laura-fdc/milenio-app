import 'server-only';
import ExcelJS from 'exceljs';
import { normId } from './db';

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
const cellText = (v) => {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') return v.text ?? v.result ?? (v.richText ? v.richText.map((r) => r.text).join('') : '');
  return String(v);
};

function toIso(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = cellText(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  if (/^\d{5}$/.test(s)) { // número de serie de Excel
    return new Date(Date.UTC(1899, 11, 30) + Number(s) * 86400000).toISOString().slice(0, 10);
  }
  return '';
}

// Excel de pagos: columnas ID SOCIO, CONCEPTO, PERIODO, IMPORTE, FECHA y (opcional) METODO.
export async function readPagosWorkbook(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const rows = [], ignored = [];
  wb.eachSheet((ws) => {
    let hr = null, cols = {};
    ws.eachRow((row, i) => {
      if (hr) return;
      const vals = row.values.map((v) => norm(cellText(v)));
      if (vals.some((v) => v.includes('ID')) && vals.some((v) => v.includes('IMPORTE') || v.includes('CUOTA'))) {
        hr = i;
        vals.forEach((v, c) => {
          if (!v) return;
          if (v.includes('ID')) cols.id ??= c;
          else if (v.includes('CONCEPTO')) cols.concepto ??= c;
          else if (v.includes('PERIODO') || v.includes('MES')) cols.periodo ??= c;
          else if (v.includes('IMPORTE') || v.includes('CUOTA') || v.includes('PAGADO')) cols.importe ??= c;
          else if (v.includes('FECHA')) cols.fecha ??= c;
          else if (v.includes('METODO') || v.includes('FORMA')) cols.metodo ??= c;
        });
      }
    });
    if (!hr) { ignored.push(`Hoja "${ws.name.trim()}": sin columnas ID SOCIO e IMPORTE`); return; }
    ws.eachRow((row, i) => {
      if (i <= hr) return;
      const g = (c) => (c ? row.getCell(c).value : null);
      const id = normId(cellText(g(cols.id)));
      if (!id || !/\d/.test(id)) return;
      const importe = Math.round(Number(cellText(g(cols.importe)).replace('€', '').replace(',', '.').trim()) * 100) / 100;
      if (!isFinite(importe) || importe <= 0) { ignored.push(`Fila ${i} (${id}): importe no válido`); return; }
      rows.push({
        id,
        concepto: cellText(g(cols.concepto)).trim() || 'Cuota',
        periodo: cellText(g(cols.periodo)).trim(),
        importe,
        fecha: toIso(g(cols.fecha)) || new Date().toISOString().slice(0, 10),
        metodo: cellText(g(cols.metodo)).trim(),
      });
    });
  });
  return { rows, ignored };
}
