import Link from 'next/link';
import { requireUser, canSeeMember } from '@/lib/session';
import { listMembers, ageOf, membersInGroup } from '@/lib/db';
import { SECTIONS } from '@/lib/catalog';
import SectionCards from '@/components/SectionCards';
import { initials, groupBadges } from '@/lib/view';
import { todayMadrid, dowOf } from '@/lib/dates';

export default async function Home() {
  const user = await requireUser();
  const members = await listMembers();

  if (user.role === 'familia') {
    const mine = members.filter((m) => canSeeMember(user, m));
    return (
      <>
        <h1>Mis fichas</h1>
        <div className="list">
          {mine.map((m) => (
            <Link key={m.id} href={`/socios/${encodeURIComponent(m.id)}`} className="row">
              <div className="mini-av">{initials(m.nombre)}</div>
              <div className="who"><b>{m.nombre}</b><small>{m.id} · {groupBadges(m).map((b) => b.label).join(' · ') || 'Sin grupo'}</small></div>
              <span className="chev">›</span>
            </Link>
          ))}
        </div>
      </>
    );
  }

  const visible = user.role === 'root' ? members : members.filter((m) => canSeeMember(user, m));
  const today = todayMadrid();
  const dow = dowOf(today);
  const myGroups = SECTIONS.flatMap((s) => s.groups).filter((g) => user.role === 'root' || user.groups.includes(g.id));
  const todayGroups = myGroups.filter((g) => g.attendance && g.sessions.some((s) => s.dow === dow));

  return (
    <>
      <h1>Hola, {user.name.split(' ')[0]} 👋</h1>

      {todayGroups.length > 0 && (
        <>
          <h2>📋 Hoy toca pasar lista</h2>
          <div className="list" style={{ marginBottom: 8 }}>
            {todayGroups.map((g) => {
              const s = g.sessions.find((x) => x.dow === dow);
              const n = membersInGroup(members, g.id).filter((m) => m.inscripciones.find((i) => i.gid === g.id).dias.includes(s.id)).length;
              return (
                <Link key={g.id} href={`/grupo/${g.id}/lista?fecha=${today}`} className="row">
                  <div className="mini-av" style={{ background: 'var(--green)', color: '#fff' }}>✓</div>
                  <div className="who"><b>{g.name}</b><small>{s.label} · {n} apuntados</small></div>
                  <span className="chev">›</span>
                </Link>
              );
            })}
          </div>
        </>
      )}

      <div className="stats" style={{ marginTop: 12 }}>
        <div className="card stat"><b>{visible.length}</b><span>Socios</span></div>
        <div className="card stat"><b>{visible.filter((m) => (ageOf(m) ?? 99) < 18).length}</b><span>Menores</span></div>
        <div className="card stat"><b>{visible.filter((m) => m.socioNuevo).length}</b><span>Socios nuevos</span></div>
        <div className="card stat"><b>{visible.filter((m) => m.observaciones).length}</b><span>Con observaciones</span></div>
      </div>

      <h2>Secciones</h2>
      <SectionCards user={user} members={members} />

      {user.role === 'entrenadora' && !user.groups.length && (
        <p className="note" style={{ marginTop: 16 }}>Aún no tienes grupos asignados. Pide al club que te los asigne.</p>
      )}
    </>
  );
}
