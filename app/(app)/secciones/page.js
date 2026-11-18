import { requireUser } from '@/lib/session';
import { listMembers } from '@/lib/db';
import SectionCards from '@/components/SectionCards';

export default async function Secciones() {
  const user = await requireUser(['root', 'entrenadora']);
  const members = await listMembers();
  return (
    <>
      <h1>Secciones</h1>
      <SectionCards user={user} members={members} />
    </>
  );
}
