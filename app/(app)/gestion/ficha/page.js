import Link from 'next/link';
import { requireUser } from '@/lib/session';
import PdfUpload from '@/components/PdfUpload';

export default async function Ficha({ searchParams }) {
  await requireUser(['root']);
  const sp = await searchParams;
  return (
    <>
      <div className="crumbs"><Link href="/gestion">Gestión</Link> › Subir ficha</div>
      <h1>Subir ficha de inscripción</h1>
      <PdfUpload forceId={sp.actualizar || null} />
    </>
  );
}
