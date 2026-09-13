import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest } from 'next/server';

import { assertMdConnectAccess } from '@/lib/mdConnectAccess';
import { readVaneLaunchToken, type VaneLaunchPayload } from '@/lib/vaneGrant';

const GRANT_COOKIE = 'vane_grant';

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

function secret() {
  return process.env.MD_CONNECT_INTEGRATION_SECRET || '';
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
    'https://search.medalsports.us',
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

function withGrantHeaders(req: NextRequest, grant: VaneLaunchPayload) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-md-connect-sub', grant.sub);
  requestHeaders.set('x-md-connect-roles', grant.roles.join(','));
  return NextResponse.next({ request: { headers: requestHeaders } });
}

async function grantFromRequest(req: NextRequest) {
  const token = req.cookies.get(GRANT_COOKIE)?.value;
  if (!token) return null;
  return readVaneLaunchToken(secret(), token);
}

async function redeemLaunch(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('launch');
  if (!token) return null;
  const payload = await readVaneLaunchToken(secret(), token);
  if (!payload) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.searchParams.delete('launch');
  const response = NextResponse.redirect(url, 303);
  response.cookies.set(GRANT_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  return response;
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
      return withGrantHeaders(req, { sub: grant.sub, roles: grant.roles, exp: 0 });
    } catch {
      return NextResponse.json({ allowed: false }, { status: 403 });
    }
  },
  { authorizedParties: authorizedParties() },
);

export default async function proxy(...args: Parameters<typeof clerk>) {
  const request = args[0] as NextRequest;
  const pathname = request.nextUrl.pathname;
  if (isHealth(pathname)) return NextResponse.next();
  if (request.method === 'OPTIONS') return corsPreflight(request);

  const launched = await redeemLaunch(request);
  if (launched) return launched;

  const grant = await grantFromRequest(request);
  if (grant) return withGrantHeaders(request, grant);
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
