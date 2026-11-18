import Link from 'next/link';
import { SECTIONS } from '@/lib/catalog';
import { membersInGroup } from '@/lib/db';

export default function SectionCards({ user, members }) {
  return (
    <div className="grid">
      {SECTIONS.map((s) => {
        const gs = s.groups.filter((g) => user.role === 'root' || user.groups.includes(g.id));
        if (!gs.length) return null;
        const n = new Set(gs.flatMap((g) => membersInGroup(members, g.id).map((m) => m.id))).size;
        return (
          <Link key={s.id} href={`/secciones/${s.id}`} className={`card sec ${s.color}`}>
            <div className="ico">{s.ico}</div>
            <h3>{s.name}</h3>
            <div className="n">{gs.length} grupos · {n} miembros</div>
          </Link>
        );
      })}
    </div>
  );
}
