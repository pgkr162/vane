import { getVaneActor } from '@/lib/vaneActor';
import { getMonthlyUsage } from '@/lib/usage/store';

export const GET = async () => {
  const actor = await getVaneActor();
  if (!actor) {
    return Response.json({ message: 'Unauthorized.' }, { status: 401 });
  }

  const usage = await getMonthlyUsage(actor.sub);
  return Response.json(
    {
      ...usage,
      canConfigure: actor.canConfigure,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
};
