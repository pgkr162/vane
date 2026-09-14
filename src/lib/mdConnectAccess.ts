import { mdConnectIntegrationSecret } from '@/lib/mdConnectSecret';

const ISSUER = process.env.MD_CONNECT_ISSUER ?? 'https://clerk.connect.medalsports.us';
const ENDPOINT =
  process.env.MD_CONNECT_ACCESS_URL ??
  'https://connect.medalsports.us/api/integrations/vane/access';

export type MdConnectGrant = {
  allowed: true;
  sub: string;
  iss: string;
  tool: 'vane';
  roles: string[];
};

export function canLaunchVane(roles: string[]) {
  return roles.includes('launch') || roles.includes('admin');
}

export function canConfigureVane(roles: string[]) {
  return roles.includes('admin');
}

export async function assertMdConnectAccess(sub: string): Promise<MdConnectGrant> {
  const secret = mdConnectIntegrationSecret();
  if (!secret || secret.length < 32 || !/^user_[A-Za-z0-9]{1,100}$/.test(sub)) {
    throw new Error('MD_CONNECT_ACCESS_DENIED');
  }

  const result = await fetch(ENDPOINT, {
    method: 'POST',
    redirect: 'error',
    cache: 'no-store',
    signal: AbortSignal.timeout(3000),
    headers: {
      'content-type': 'application/json',
      'x-md-connect-integration-secret': secret,
    },
    body: JSON.stringify({ sub, iss: ISSUER }),
  });
  if (result.status !== 200) throw new Error('MD_CONNECT_ACCESS_DENIED');

  const data = (await result.json()) as Partial<MdConnectGrant> & { allowed?: boolean };
  if (
    data.allowed !== true ||
    data.sub !== sub ||
    data.iss !== ISSUER ||
    data.tool !== 'vane' ||
    !Array.isArray(data.roles) ||
    !canLaunchVane(data.roles)
  ) {
    throw new Error('MD_CONNECT_ACCESS_DENIED');
  }

  return data as MdConnectGrant;
}
