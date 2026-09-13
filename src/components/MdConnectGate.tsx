'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState, type ReactNode } from 'react';

const SIGN_IN = 'https://connect.medalsports.us/sign-in';
const ACCESS_DENIED = 'https://connect.medalsports.us/access-denied?tool=vane';

export default function MdConnectGate({ children }: { children: ReactNode }) {
  const { isLoaded, userId } = useAuth();
  const [signInHref, setSignInHref] = useState(SIGN_IN);

  useEffect(() => {
    const signIn = new URL(SIGN_IN);
    signIn.searchParams.set('redirect_url', window.location.origin);
    setSignInHref(signIn.toString());
  }, []);

  useEffect(() => {
    if (!isLoaded || !userId) return;
    fetch('/api/md-connect/me', { cache: 'no-store' })
      .then((response) => {
        if (response.status === 403) window.location.replace(ACCESS_DENIED);
      })
      .catch(() => {});
  }, [isLoaded, userId]);

  if (!isLoaded) {
    return (
      <div className="grid h-full place-items-center text-sm text-black/50 dark:text-white/50">
        Connecting…
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="grid h-full place-items-center">
        <a
          className="rounded-lg bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
          href={signInHref}
        >
          Sign in with MD Connect
        </a>
      </div>
    );
  }

  return children;
}
