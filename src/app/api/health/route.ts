export const dynamic = 'force-dynamic';

export const GET = async () =>
  Response.json({ ok: true, service: 'vane' }, { headers: { 'Cache-Control': 'no-store' } });
