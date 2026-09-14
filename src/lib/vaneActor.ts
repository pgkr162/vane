import { cookies } from 'next/headers';
import { auth } from '@clerk/nextjs/server';

import {
  assertMdConnectAccess,
  canConfigureVane,
  canLaunchVane,
} from '@/lib/mdConnectAccess';
import { readVaneLaunchToken } from '@/lib/vaneGrant';

export type VaneActor = {
  sub: string;
  roles: string[];
  canConfigure: boolean;
};

export async function getVaneActor(): Promise<VaneActor | null> {
  const token = (await cookies()).get('vane_grant')?.value;
  if (token) {
    const grant = await readVaneLaunchToken(
      process.env.MD_CONNECT_INTEGRATION_SECRET || '',
      token,
    );
    if (grant && canLaunchVane(grant.roles)) {
      return {
        sub: grant.sub,
        roles: grant.roles,
        canConfigure: canConfigureVane(grant.roles),
      };
    }
  }

  const { userId } = await auth();
  if (!userId) return null;
  try {
    const grant = await assertMdConnectAccess(userId);
    return {
      sub: grant.sub,
      roles: grant.roles,
      canConfigure: canConfigureVane(grant.roles),
    };
  } catch {
    return null;
  }
}
