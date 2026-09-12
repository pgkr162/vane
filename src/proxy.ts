import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest } from 'next/server';

import { assertMdConnectAccess } from '@/lib/mdConnectAccess';

const ACCESS_DENIED = 'https://connect.medalsports.us/access-denied?tool=vane';
const SIGN_IN = 'https://connect.medalsports.us/sign-in';

function isPublic(pathname: string) {
  return pathname === '/api/health' || pathname.startsWith('/__clerk');
}

function publicOrigin(req: NextRequest) {
  const configured = process.env.VANE_PUBLIC_URL || process.env.RAILWAY_PUBLIC_DOMAIN;
  if (configured) {
    return configured.startsWith('http') ? configured.replace(/\/$/, '') : `https://${configured}`;
  }
  const host = req.headers.get('x-forwarded-host');
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  if (host) return `${proto}://${host}`;
  return req.nextUrl.origin;
}

function authorizedParties() {
  return (process.env.CLERK_AUTHORIZED_PARTIES || 'https://connect.medalsports.us')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

const clerk = clerkMiddleware(
  async (auth, req) => {
    if (isPublic(req.nextUrl.pathname)) return NextResponse.next();

    const { userId } = await auth();
    if (!userId) {
      const signIn = new URL(SIGN_IN);
      signIn.searchParams.set('redirect_url', publicOrigin(req));
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

export default function proxy(...args: Parameters<typeof clerk>) {
  const request = args[0] as NextRequest;
  if (isPublic(request.nextUrl.pathname)) return NextResponse.next();
  return clerk(...args);
}

export const config = {
  matcher: [
    '/((?!_next|api/health|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
};
