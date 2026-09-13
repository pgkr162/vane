'use client';

import { useEffect, useState, type ReactNode } from 'react';

const SIGN_IN = 'https://connect.medalsports.us/sign-in';
const ACCESS_DENIED = 'https://connect.medalsports.us/access-denied?tool=vane';

export default function MdConnectGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'wait' | 'guest' | 'ok'>('wait');
  const [signInHref, setSignInHref] = useState(SIGN_IN);

  useEffect(() => {
    const signIn = new URL(SIGN_IN);
    signIn.searchParams.set('redirect_url', window.location.origin);
    setSignInHref(signIn.toString());
  }, []);

  useEffect(() => {
    fetch('/api/md-connect/me', { cache: 'no-store', credentials: 'same-origin' })
      .then(async (response) => {
        if (response.status === 403) {
          window.location.replace(ACCESS_DENIED);
          return;
        }
        if (response.status !== 200) {
          setState('guest');
          return;
        }
        const data = (await response.json()) as { allowed?: boolean };
        setState(data.allowed ? 'ok' : 'guest');
      })
      .catch(() => setState('guest'));
  }, []);

  if (state === 'ok') return children;

  return (
    <div className="grid h-full min-h-screen place-items-center bg-black">
      {state === 'guest' ? (
        <a className="rounded-lg bg-white px-4 py-2 text-sm text-black" href={signInHref}>
          Sign in with MD Connect
        </a>
      ) : (
        <p className="text-sm text-white/50">Connecting…</p>
      )}
    </div>
  );
}
