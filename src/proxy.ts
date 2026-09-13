import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest } from 'next/server';

import { assertMdConnectAccess } from '@/lib/mdConnectAccess';

function isHealth(pathname: string) {
  return pathname === '/api/health';
}

function isClerkInternal(pathname: string) {
  return pathname.startsWith('/__clerk');
}

function isApi(pathname: string) {
  return pathname.startsWith('/api/') || pathname.startsWith('/trpc/');
}

function needsClerk(pathname: string) {
  return isApi(pathname) || isClerkInternal(pathname);
}

function authorizedParties() {
  return (process.env.CLERK_AUTHORIZED_PARTIES || 'https://connect.medalsports.us')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function corsPreflight(req: NextRequest) {
  const origin = req.headers.get('origin') || '';
  const allowed = new Set([
    'https://connect.medalsports.us',
    'https://clerk.connect.medalsports.us',
    'https://vane.medalsports.us',
  ]);
  const headers = new Headers();
  if (allowed.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Vary', 'Origin');
  }
  headers.set('Access-Control-Allow-Methods', 'GET,HEAD,POST,OPTIONS');
  headers.set(
    'Access-Control-Allow-Headers',
    req.headers.get('access-control-request-headers') || 'Content-Type, Authorization',
  );
  headers.set('Access-Control-Max-Age', '86400');
  return new NextResponse(null, { status: 204, headers });
}

const clerk = clerkMiddleware(
  async (auth, req) => {
    if (isHealth(req.nextUrl.pathname) || isClerkInternal(req.nextUrl.pathname)) {
      return NextResponse.next();
    }

    if (req.method === 'OPTIONS') return corsPreflight(req);

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ allowed: false }, { status: 401 });
    }

    try {
      const grant = await assertMdConnectAccess(userId);
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set('x-md-connect-sub', grant.sub);
      requestHeaders.set('x-md-connect-roles', grant.roles.join(','));
      return NextResponse.next({ request: { headers: requestHeaders } });
    } catch {
      return NextResponse.json({ allowed: false }, { status: 403 });
    }
  },
  { authorizedParties: authorizedParties() },
);

export default function proxy(...args: Parameters<typeof clerk>) {
  const request = args[0] as NextRequest;
  const pathname = request.nextUrl.pathname;
  if (isHealth(pathname)) return NextResponse.next();
  if (request.method === 'OPTIONS') return corsPreflight(request);
  // HTML must stay 200. Clerk handshake 307s are what Safari reports as “couldn’t load”.
  if (!needsClerk(pathname)) return NextResponse.next();
  return clerk(...args);
}

export const config = {
  matcher: [
    '/((?!_next|api/health|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/(.*)',
  ],
};
