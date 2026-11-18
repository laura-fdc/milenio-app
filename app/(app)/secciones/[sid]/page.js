import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { listMembers, membersInGroup } from '@/lib/db';
import { getSection } from '@/lib/catalog';

export default async function Seccion({ params }) {
  const { sid } = await params;
  const user = await requireUser(['root', 'entrenadora']);
  const s = getSection(sid);
  if (!s) notFound();
  const members = await listMembers();
  const groups = s.groups.filter((g) => user.role === 'root' || user.groups.includes(g.id));

  return (
    <>
      <div className="crumbs"><Link href="/secciones">Secciones</Link> › {s.name}</div>
      <h1>{s.ico} {s.name}</h1>
      <div className="grid">
        {groups.map((g) => (
          <Link key={g.id} href={`/grupo/${g.id}`} className={`card sec ${s.color}`}>
            <h3>{g.name}</h3>
            <div className="n">{membersInGroup(members, g.id).length} miembros</div>
            <div className="n small" style={{ marginTop: 4 }}>
              {g.sessions.length ? (g.sessions.length > 3 ? `${g.sessions.length} horarios` : g.sessions.map((x) => x.label).join(' · ')) : 'Según calendario'}
            </div>
            {g.attendance && <span className="tag ok" style={{ marginTop: 8 }}>📋 Pasar lista</span>}
          </Link>
        ))}
      </div>
    </>
  );
}
