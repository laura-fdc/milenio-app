import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { getMember } from '@/lib/db';
import MemberForm from '@/components/MemberForm';

export default async function Editar({ params }) {
  const { id } = await params;
  await requireUser(['root']);
  const m = await getMember(decodeURIComponent(id));
  if (!m) notFound();
  return (
    <>
      <div className="crumbs"><Link href="/socios">Socios</Link> › <Link href={`/socios/${encodeURIComponent(m.id)}`}>{m.id}</Link> › Editar</div>
      <h1>Editar ficha</h1>
      <MemberForm initial={m} originalId={m.id} />
    </>
  );
}
