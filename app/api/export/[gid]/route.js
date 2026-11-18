import ExcelJS from 'exceljs';
import { currentUser, canSeeGroup, redact } from '@/lib/session';
import { listMembers, membersInGroup, ageOf, enrollment } from '@/lib/db';
import { getGroup } from '@/lib/catalog';
import { COLUMNS, groupBadges } from '@/lib/view';

export async function GET(_req, { params }) {
  const { gid } = await params;
  const u = await currentUser();
  if (!u || !['root', 'entrenadora'].includes(u.role)) return new Response('No autorizado', { status: 403 });

  const all = await listMembers();
  let list, title;
  if (gid === 'todos') {
    if (u.role !== 'root') return new Response('No autorizado', { status: 403 });
    list = all; title = 'Socios';
  } else {
    const g = getGroup(gid);
    if (!g || !canSeeGroup(u, gid)) return new Response('No autorizado', { status: 403 });
    list = membersInGroup(all, gid); title = g.name;
  }

  const rows = list.map((m) => {
    const e = gid !== 'todos' ? enrollment(m, gid) : null;
    const g = gid !== 'todos' ? getGroup(gid) : null;
    return {
      ...redact(u, m),
      edadCalc: ageOf(m),
      diasTexto: e ? e.dias.map((d) => g.sessions.find((s) => s.id === d)?.label).join(', ') : groupBadges(m).map((b) => b.label).join('; '),
    };
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(title.slice(0, 30));
  const cols = gid === 'todos' ? COLUMNS.map(([h, f]) => (h === 'Días' ? ['Grupos', f] : [h, f])) : COLUMNS;
  ws.addRow(cols.map(([h]) => h)).font = { bold: true };
  rows.forEach((m) => ws.addRow(cols.map(([, f]) => f(m) ?? '')));
  ws.columns.forEach((c) => (c.width = 18));
  const buf = await wb.xlsx.writeBuffer();
  const fname = `${title} ${new Date().toISOString().slice(0, 10)}.xlsx`.replace(/[^\w\s.-]/g, '');
  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fname}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
