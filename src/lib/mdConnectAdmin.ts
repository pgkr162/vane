import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { assertMdConnectAccess, canConfigureVane } from '@/lib/mdConnectAccess';

export async function requireVaneAdmin() {
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
