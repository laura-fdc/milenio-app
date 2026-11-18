import Link from 'next/link';
import { requireUser } from '@/lib/session';
import { nextMemberId } from '@/lib/db';
import MemberForm from '@/components/MemberForm';

export default async function Nuevo() {
  await requireUser(['root']);
  return (
    <>
      <div className="crumbs"><Link href="/gestion">Gestión</Link> › Nueva ficha</div>
      <h1>Nueva ficha</h1>
      <MemberForm initial={{ id: await nextMemberId(), socioNuevo: true }} />
    </>
  );
}
