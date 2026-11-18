import Link from 'next/link';
import { requireUser, canSeeMember, redact } from '@/lib/session';
import { listMembers, ageOf } from '@/lib/db';
import MemberList from '@/components/MemberList';

export default async function Socios() {
  const user = await requireUser(['root', 'entrenadora']);
  const list = (await listMembers())
    .filter((m) => canSeeMember(user, m))
    .map((m) => ({ ...redact(user, m), edadCalc: ageOf(m) }));
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h1 style={{ flex: 1 }}>{user.role === 'root' ? 'Todos los socios' : 'Mis socios'}</h1>
        {user.role === 'root' && <Link className="btn" href="/gestion/ficha">＋ Ficha</Link>}
      </div>
      <MemberList members={list} showGroups exportHref={user.role === 'root' ? '/api/export/todos' : null} />
    </>
  );
}
