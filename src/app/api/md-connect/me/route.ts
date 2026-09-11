import { auth } from '@clerk/nextjs/server';

import { assertMdConnectAccess, canConfigureVane, canLaunchVane } from '@/lib/mdConnectAccess';

export const GET = async () => {
  const { userId } = await auth();
  if (!userId) return Response.json({ allowed: false }, { status: 401 });
  try {
    const grant = await assertMdConnectAccess(userId);
    return Response.json(
      {
        allowed: canLaunchVane(grant.roles),
        canConfigure: canConfigureVane(grant.roles),
        roles: grant.roles,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch {
    return Response.json({ allowed: false }, { status: 403 });
  }
};
