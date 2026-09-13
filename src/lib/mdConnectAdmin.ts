import { cookies } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { assertMdConnectAccess, canConfigureVane } from '@/lib/mdConnectAccess';
import { readVaneLaunchToken } from '@/lib/vaneGrant';

export async function requireVaneAdmin() {
  const token = (await cookies()).get('vane_grant')?.value;
  const cookieGrant = token
    ? await readVaneLaunchToken(process.env.MD_CONNECT_INTEGRATION_SECRET || '', token)
    : null;
  if (cookieGrant) {
    if (!canConfigureVane(cookieGrant.roles)) {
      return NextResponse.json({ message: 'Forbidden.' }, { status: 403 });
    }
    return null;
  }

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  try {
    const grant = await assertMdConnectAccess(userId);
    if (!canConfigureVane(grant.roles)) {
      return NextResponse.json({ message: 'Forbidden.' }, { status: 403 });
    }
    return null;
  } catch {
    return NextResponse.json({ message: 'Forbidden.' }, { status: 403 });
  }
}
