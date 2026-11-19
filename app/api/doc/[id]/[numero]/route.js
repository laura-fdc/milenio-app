import { currentUser, canSeeMember } from '@/lib/session';
import { getMember, getDocs } from '@/lib/db';
import { renderDoc } from '@/lib/recibo';

export async function GET(_req, { params }) {
  const { id, numero } = await params;
  const u = await currentUser();
  const m = await getMember(decodeURIComponent(id));
  if (!u || !m || !canSeeMember(u, m) || !['root', 'familia'].includes(u.role)) return new Response('No autorizado', { status: 403 });
  const doc = (await getDocs(m.id)).find((d) => d.numero === decodeURIComponent(numero));
  if (!doc) return new Response('No encontrado', { status: 404 });
  const bytes = await renderDoc(doc);
  const name = `${doc.tipo === 'factura' ? 'Factura' : 'Justificante'} ${doc.numero} ${m.nombre}`.replace(/[^\w\s.-]/g, '');
  return new Response(Buffer.from(bytes), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${name}.pdf"`, 'Cache-Control': 'private, no-store' },
  });
}
