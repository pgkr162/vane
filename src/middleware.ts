import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { assertMdConnectAccess } from '@/lib/mdConnectAccess';

const ACCESS_DENIED = 'https://connect.medalsports.us/access-denied?tool=vane';
const SIGN_IN = 'https://connect.medalsports.us/sign-in';

function isPublic(pathname: string) {
  return pathname === '/api/health' || pathname.startsWith('/__clerk');
}

function authorizedParties() {
  return (process.env.CLERK_AUTHORIZED_PARTIES || 'https://connect.medalsports.us')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export default clerkMiddleware(
  async (auth, req) => {
    if (isPublic(req.nextUrl.pathname)) return NextResponse.next();

    const { userId } = await auth();
    if (!userId) {
      const signIn = new URL(SIGN_IN);
      signIn.searchParams.set('redirect_url', req.nextUrl.origin);
      return NextResponse.redirect(signIn);
    }

    try {
      const grant = await assertMdConnectAccess(userId);
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set('x-md-connect-sub', grant.sub);
      requestHeaders.set('x-md-connect-roles', grant.roles.join(','));
      return NextResponse.next({ request: { headers: requestHeaders } });
    } catch {
      if (req.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json({ allowed: false }, { status: 403 });
      }
      return NextResponse.redirect(ACCESS_DENIED);
    }
  },
  { authorizedParties: authorizedParties() },
);

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
