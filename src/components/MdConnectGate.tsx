'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, type ReactNode } from 'react';

const SIGN_IN = 'https://connect.medalsports.us/sign-in';
const ACCESS_DENIED = 'https://connect.medalsports.us/access-denied?tool=vane';

export default function MdConnectGate({ children }: { children: ReactNode }) {
  const { isLoaded, userId } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    if (!userId) {
      const signIn = new URL(SIGN_IN);
      signIn.searchParams.set('redirect_url', window.location.origin);
      window.location.replace(signIn.toString());
      return;
    }

    fetch('/api/md-connect/me', { cache: 'no-store' })
      .then((response) => {
        if (response.status === 403) window.location.replace(ACCESS_DENIED);
      })
      .catch(() => {});
  }, [isLoaded, userId]);

  if (!isLoaded || !userId) {
    return (
      <div className="grid h-full place-items-center text-sm text-black/50 dark:text-white/50">
        Connecting…
      </div>
    );
  }

  return children;
}
