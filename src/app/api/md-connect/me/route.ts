import { cookies } from 'next/headers';
import { auth } from '@clerk/nextjs/server';

import { assertMdConnectAccess, canConfigureVane, canLaunchVane } from '@/lib/mdConnectAccess';
import { readVaneLaunchToken } from '@/lib/vaneGrant';

async function grantFromCookie() {
  const token = (await cookies()).get('vane_grant')?.value;
  if (!token) return null;
  return readVaneLaunchToken(process.env.MD_CONNECT_INTEGRATION_SECRET || '', token);
}

export const GET = async () => {
  const cookieGrant = await grantFromCookie();
  if (cookieGrant) {
    return Response.json(
      {
        allowed: canLaunchVane(cookieGrant.roles),
        canConfigure: canConfigureVane(cookieGrant.roles),
        roles: cookieGrant.roles,
        sub: cookieGrant.sub,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  const { userId } = await auth();
  if (!userId) return Response.json({ allowed: false }, { status: 401 });
  try {
    const grant = await assertMdConnectAccess(userId);
    return Response.json(
      {
        allowed: canLaunchVane(grant.roles),
        canConfigure: canConfigureVane(grant.roles),
        roles: grant.roles,
        sub: grant.sub,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch {
    return Response.json({ allowed: false }, { status: 403 });
  }
};
