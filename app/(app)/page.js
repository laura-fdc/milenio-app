import Link from 'next/link';
import { requireUser, canSeeMember } from '@/lib/session';
import { listMembers, ageOf, membersInGroup, listComunicados, getFeed } from '@/lib/db';
import PushToggle from '@/components/PushToggle';
import ComunicadoList from '@/components/ComunicadoList';

const fmtShort = (iso) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'Europe/Madrid' }).format(new Date(iso));
import { SECTIONS } from '@/lib/catalog';
import SectionCards from '@/components/SectionCards';
import { initials, groupBadges } from '@/lib/view';
import { todayMadrid, dowOf } from '@/lib/dates';

export default async function Home() {
  const user = await requireUser();
  const members = await listMembers();

  const comunicados = await listComunicados();

  if (user.role === 'familia') {
    const mine = members.filter((m) => canSeeMember(user, m));
    const myGids = new Set(mine.flatMap((m) => (m.inscripciones || []).map((i) => i.gid)));
    const mineCom = comunicados.filter((c) => c.todos || c.groups.some((g) => myGids.has(g))).slice(0, 10);
    const feed = (await getFeed(user.email)).filter((f) => f.kind !== 'comunicado').slice(0, 10);
    return (
      <>
        <h1>Mis fichas</h1>
        <div className="list">
          {mine.map((m) => (
            <Link key={m.id} href={`/socios/${encodeURIComponent(m.id)}`} className="row">
              <div className="mini-av">{initials(m.nombre)}</div>
              <div className="who"><b>{m.nombre}</b><small><b>ID socio {m.id}</b> · {groupBadges(m).map((b) => b.label).join(' · ') || 'Sin grupo'}</small></div>
              <span className="chev">›</span>
            </Link>
          ))}
        </div>
        <p className="small muted">Entra en la ficha para avisar de que no irá a clase o elegir cómo quieres recibir los avisos.</p>
        <div style={{ margin: '12px 0' }}><PushToggle /></div>

        <h2>📢 Comunicados del club</h2>
        <ComunicadoList items={mineCom} empty="No hay comunicados." />

        {feed.length > 0 && (
          <>
            <h2>🔔 Últimos avisos</h2>
            <div className="list">
              {feed.map((f) => (
                <Link key={f.id} href={f.url || '/'} className="row">
                  <div className="who"><b>{f.title}</b><small style={{ whiteSpace: 'normal' }}>{f.body.split('\n')[0]}</small></div>
                  <span className="muted small">{fmtShort(f.at)}</span>
                </Link>
              ))}
            </div>
          </>
        )}
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <h2 style={{ flex: 1 }}>📢 Comunicados</h2>
        {user.role === 'root' && <Link className="btn ghost" style={{ padding: '8px 12px' }} href="/gestion/comunicados">＋ Nuevo</Link>}
      </div>
      <ComunicadoList items={comunicados.filter((c) => user.role === 'root' || c.todos || c.groups.some((g) => user.groups.includes(g))).slice(0, 5)} empty="Todavía no hay comunicados." />
      {user.role === 'entrenadora' && <div style={{ marginTop: 12 }}><PushToggle /></div>}

      {user.role === 'entrenadora' && !user.groups.length && (
        <p className="note" style={{ marginTop: 16 }}>Aún no tienes grupos asignados. Pide al club que te los asigne.</p>
      )}
    </>
  );
}
