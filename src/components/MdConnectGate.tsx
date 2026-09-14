'use client';

import { useEffect, useState, type ReactNode } from 'react';

const SIGN_IN = 'https://connect.medalsports.us/sign-in';
const ACCESS_DENIED = 'https://connect.medalsports.us/access-denied?tool=vane';

export default function MdConnectGate({ children }: { children: ReactNode }) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const signIn = new URL(SIGN_IN);
    signIn.searchParams.set('redirect_url', `${window.location.origin}/`);

    fetch('/api/md-connect/me', {
      cache: 'no-store',
      credentials: 'same-origin',
    })
      .then(async (response) => {
        if (response.status === 403) {
          window.location.replace(ACCESS_DENIED);
          return;
        }
        if (response.status !== 200) {
          window.location.replace(signIn.toString());
          return;
        }
        const data = (await response.json()) as { allowed?: boolean };
        if (!data.allowed) {
          window.location.replace(signIn.toString());
          return;
        }
        setAllowed(true);
      })
      .catch(() => {
        window.location.replace(signIn.toString());
      });
  }, []);

  if (!allowed) return null;
  return children;
}
