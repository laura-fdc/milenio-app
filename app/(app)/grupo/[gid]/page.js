import { notFound, redirect } from 'next/navigation';
import { requireUser, canSeeGroup, redact } from '@/lib/session';
import { listMembers, membersInGroup, ageOf, enrollment } from '@/lib/db';
import { getGroup } from '@/lib/catalog';
import GroupHeader from '@/components/GroupHeader';
import MemberList from '@/components/MemberList';

export default async function Grupo({ params }) {
  const { gid } = await params;
  const user = await requireUser(['root', 'entrenadora']);
  const g = getGroup(gid);
  if (!g) notFound();
  if (!canSeeGroup(user, gid)) redirect('/secciones');

  const list = membersInGroup(await listMembers(), gid).map((m) => {
    const e = enrollment(m, gid);
    return {
      ...redact(user, m),
      edadCalc: ageOf(m),
      diasTexto: e.dias.map((d) => g.sessions.find((s) => s.id === d)?.label).filter(Boolean).join(', '),
    };
  });

  return (
    <>
      <GroupHeader g={g} tab="miembros" />
      <p className="muted small" style={{ marginTop: -6 }}>{g.price}</p>
      <MemberList members={list} exportHref={`/api/export/${gid}`} showDays={g.sessions.length > 0} />
    </>
  );
}
