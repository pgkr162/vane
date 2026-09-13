'use client';

import { ClerkProvider } from '@clerk/nextjs';
import type { ReactNode } from 'react';

const SIGN_IN = 'https://connect.medalsports.us/sign-in';

export default function MdConnectProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      signInUrl={SIGN_IN}
      signUpUrl={SIGN_IN}
      afterSignOutUrl="https://connect.medalsports.us/home"
    >
      {children}
    </ClerkProvider>
  );
}
