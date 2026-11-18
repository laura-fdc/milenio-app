import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireUser, canSeeGroup } from '@/lib/session';
import { listMembers, membersInGroup, attendanceDates, getAttendance } from '@/lib/db';
import { getGroup } from '@/lib/catalog';
import GroupHeader from '@/components/GroupHeader';
import { cap } from '@/lib/dates';

export default async function Historial({ params, searchParams }) {
  const { gid } = await params;
  const sp = await searchParams;
  const user = await requireUser(['root', 'entrenadora']);
  const g = getGroup(gid);
  if (!g || !g.attendance) notFound();
  if (!canSeeGroup(user, gid)) redirect('/secciones');

  const allDates = await attendanceDates(gid);
  const months = [...new Set(allDates.map((d) => d.slice(0, 7)))];
  const month = sp.mes && months.includes(sp.mes) ? sp.mes : months.at(-1);
  const dates = allDates.filter((d) => d.startsWith(month || ''));
  const att = Object.fromEntries(await Promise.all(dates.map(async (d) => [d, await getAttendance(gid, d)])));
  const members = membersInGroup(await listMembers(), gid);

  const monthName = (ym) => cap(new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7) - 1, 1))));

  return (
    <>
      <GroupHeader g={g} tab="historial" />
      {!dates.length ? (
        <div className="card muted">Todavía no se ha pasado lista en este grupo.</div>
      ) : (
        <>
          <div className="subtabs">
            {months.map((m) => (
              <Link key={m} href={`/grupo/${gid}/historial?mes=${m}`} className={m === month ? 'active' : ''}>
                {monthName(m)}
              </Link>
            ))}
          </div>
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th className="sticky">Nombre</th>
                  {dates.map((d) => (
                    <th key={d} className="c"><Link href={`/grupo/${gid}/lista?fecha=${d}`}>{d.slice(8)}/{d.slice(5, 7)}</Link></th>
                  ))}
                  <th className="c">%</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const vals = dates.map((d) => att[d][m.id]);
                  const marked = vals.filter((v) => v !== undefined && v !== null);
                  const pres = marked.filter((v) => Number(v) === 1).length;
                  return (
                    <tr key={m.id}>
                      <td className="sticky"><Link href={`/socios/${encodeURIComponent(m.id)}`}><b>{m.nombre}</b></Link></td>
                      {vals.map((v, i) => (
                        <td key={dates[i]} className="c">{v === undefined || v === null ? '·' : Number(v) === 1 ? '✅' : '❌'}</td>
                      ))}
                      <td className="c"><b>{marked.length ? Math.round((pres / marked.length) * 100) + '%' : '—'}</b></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="small muted">Pulsa una fecha para abrir o corregir la lista de ese día.</p>
        </>
      )}
    </>
  );
}
