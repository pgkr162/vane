const encoder = new TextEncoder();

export type VaneLaunchPayload = {
  sub: string;
  exp: number;
  roles: string[];
};

function bytesToB64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function b64UrlToBytes(value: string) {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hmacSign(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  return bytesToB64Url(new Uint8Array(signature));
}

export async function mintVaneLaunchToken(
  secret: string,
  payload: { sub: string; roles: string[] },
  now = Date.now(),
  ttlMs = 10 * 60 * 1000,
) {
  if (
    secret.length < 32 ||
    !/^user_[A-Za-z0-9]{1,100}$/.test(payload.sub) ||
    payload.roles.length === 0 ||
    ttlMs <= 0
  ) {
    return null;
  }
  const body = bytesToB64Url(
    encoder.encode(
      JSON.stringify({
        sub: payload.sub,
        roles: payload.roles,
        exp: now + ttlMs,
      }),
    ),
  );
  return `${body}.${await hmacSign(secret, body)}`;
}

export async function readVaneLaunchToken(secret: string, token: string, now = Date.now()) {
  if (secret.length < 32 || token.length > 2048) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const expected = await hmacSign(secret, body);
  if (expected.length !== signature.length || expected !== signature) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(b64UrlToBytes(body))) as Partial<VaneLaunchPayload>;
    if (
      typeof parsed.sub !== 'string' ||
      !/^user_[A-Za-z0-9]{1,100}$/.test(parsed.sub) ||
      typeof parsed.exp !== 'number' ||
      parsed.exp <= now ||
      !Array.isArray(parsed.roles) ||
      parsed.roles.length === 0 ||
      parsed.roles.some((role) => role !== 'launch' && role !== 'admin')
    ) {
      return null;
    }
    return parsed as VaneLaunchPayload;
  } catch {
    return null;
  }
}
