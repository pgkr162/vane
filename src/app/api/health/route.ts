export const dynamic = 'force-dynamic';
export const instant = false;

export const GET = async () =>
  Response.json({ ok: true, service: 'vane' }, { headers: { 'Cache-Control': 'no-store' } });
