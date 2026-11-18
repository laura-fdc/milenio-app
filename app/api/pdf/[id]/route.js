import { currentUser } from '@/lib/session';
import { getPdf, getMember } from '@/lib/db';

export async function GET(_req, { params }) {
  const { id } = await params;
  const u = await currentUser();
  if (u?.role !== 'root') return new Response('No autorizado', { status: 403 });
  const b64 = await getPdf(decodeURIComponent(id));
  if (!b64) return new Response('No hay PDF', { status: 404 });
  const m = await getMember(decodeURIComponent(id));
  const name = `Ficha ${m?.id || id} ${m?.nombre || ''}`.trim().replace(/[^\w\s.-]/g, '');
  return new Response(Buffer.from(b64, 'base64'), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${name}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
