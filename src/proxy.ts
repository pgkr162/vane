import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest } from 'next/server';

import { assertMdConnectAccess } from '@/lib/mdConnectAccess';
import { mdConnectIntegrationSecret } from '@/lib/mdConnectSecret';
import {
  mintVaneLaunchToken,
  readVaneLaunchToken,
  type VaneLaunchPayload,
} from '@/lib/vaneGrant';

const GRANT_COOKIE = 'vane_grant';
const SESSION_TTL_MS = 60 * 60 * 12 * 1000;
const CONNECT_SIGN_IN = 'https://connect.medalsports.us/sign-in';

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
  return mdConnectIntegrationSecret();
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

function connectSignIn(req: NextRequest) {
  const configured = process.env.VANE_PUBLIC_URL || `${req.nextUrl.origin}/`;
  const redirectUrl = configured.endsWith('/') ? configured : `${configured}/`;
  const url = new URL(CONNECT_SIGN_IN);
  url.searchParams.set('redirect_url', redirectUrl);
  return NextResponse.redirect(url);
}

async function redeemLaunch(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('launch');
  if (!token) return null;
  const payload = await readVaneLaunchToken(secret(), token);
  if (!payload) return null;
  const session = await mintVaneLaunchToken(
    secret(),
    { sub: payload.sub, roles: payload.roles },
    Date.now(),
    SESSION_TTL_MS,
  );
  if (!session) return null;
  const url = req.nextUrl.clone();
  url.searchParams.delete('launch');
  const response = NextResponse.redirect(url, 303);
  response.cookies.set(GRANT_COOKIE, session, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
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
  if (!needsClerk(pathname)) return connectSignIn(request);
  return clerk(...args);
}

export const config = {
  matcher: [
    '/((?!_next|api/health|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/(.*)',
  ],
};
