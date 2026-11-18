import { iconResponse } from '@/lib/icon';

export async function GET(req, { params }) {
  const { size } = await params;
  const s = Math.min(1024, Math.max(16, Number(size) || 192));
  const maskable = new URL(req.url).searchParams.has('maskable');
  return iconResponse(s, { maskable });
}
