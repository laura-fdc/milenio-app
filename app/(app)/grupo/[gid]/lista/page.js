import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireUser, canSeeGroup } from '@/lib/session';
import { listMembers, membersInGroup, enrollment, getAttendance, ageOf } from '@/lib/db';
import { getGroup } from '@/lib/catalog';
import { todayMadrid, dowOf, isIso, nearestSessionDay, prettyDate } from '@/lib/dates';
import GroupHeader from '@/components/GroupHeader';
import AttendanceList from '@/components/AttendanceList';
import DatePicker from '@/components/DatePicker';

export default async function Lista({ params, searchParams }) {
  const { gid } = await params;
  const sp = await searchParams;
  const user = await requireUser(['root', 'entrenadora']);
  const g = getGroup(gid);
  if (!g || !g.attendance) notFound();
  if (!canSeeGroup(user, gid)) redirect('/secciones');

  const dows = [...new Set(g.sessions.map((s) => s.dow))];
  const today = todayMadrid();
  const fecha = isIso(sp.fecha) ? sp.fecha : nearestSessionDay(today, dows, -1);
  const dow = dowOf(fecha);
  const sessionsToday = g.sessions.filter((s) => s.dow === dow);
  const showAll = sp.todos === '1';

  const all = membersInGroup(await listMembers(), gid);
  const expected = all.filter((m) => enrollment(m, gid).dias.some((d) => sessionsToday.some((s) => s.id === d)));
  const shown = showAll ? all : expected;
  const att = await getAttendance(gid, fecha);

  const prev = nearestSessionDay(fecha, dows, -1, false);
  const next = nearestSessionDay(fecha, dows, 1, false);
  const base = `/grupo/${gid}/lista`;

  return (
    <>
      <GroupHeader g={g} tab="lista" />
      <div className="datebar">
        <Link className="btn ghost" href={`${base}?fecha=${prev}`} aria-label="Sesión anterior">‹</Link>
        <DatePicker value={fecha} base={base} />
        <Link className="btn ghost" href={`${base}?fecha=${next}`} aria-label="Sesión siguiente">›</Link>
      </div>
      <p style={{ margin: '0 0 10px' }}>
        <b>{prettyDate(fecha)}</b>
        {fecha === today && <span className="tag ok" style={{ marginLeft: 6 }}>Hoy</span>}
        <span className="muted small"> · {sessionsToday.length ? sessionsToday.map((s) => s.label).join(', ') : 'sin sesión'}</span>
      </p>

      {!sessionsToday.length && !showAll ? (
        <div className="card">
          <p style={{ marginTop: 0 }}>Este grupo no tiene sesión los {prettyDate(fecha).split(',')[0].toLowerCase()}.</p>
          <div className="toolbar" style={{ margin: 0 }}>
            <Link className="btn" href={`${base}?fecha=${nearestSessionDay(fecha, dows, -1)}`}>Ir a la sesión anterior</Link>
            <Link className="btn ghost" href={`${base}?fecha=${fecha}&todos=1`}>Pasar lista igualmente</Link>
          </div>
        </div>
      ) : (
        <>
          <AttendanceList
            key={`${fecha}-${showAll}`}
            gid={gid}
            fecha={fecha}
            initial={att}
            members={shown.map((m) => ({ id: m.id, nombre: m.nombre, edad: ageOf(m), observaciones: m.observaciones || '' }))}
          />
          <p className="small muted" style={{ marginTop: 12 }}>
            {showAll
              ? <>Mostrando todo el grupo. <Link href={`${base}?fecha=${fecha}`} style={{ color: 'var(--orange-d)', fontWeight: 600 }}>Ver solo los apuntados a este día</Link></>
              : <>Solo aparecen los apuntados a este día. <Link href={`${base}?fecha=${fecha}&todos=1`} style={{ color: 'var(--orange-d)', fontWeight: 600 }}>Mostrar todo el grupo</Link></>}
          </p>
        </>
      )}
    </>
  );
}
