'use client';

import { ClerkProvider } from '@clerk/nextjs';
import type { ReactNode } from 'react';

export default function MdConnectProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      signInUrl="https://connect.medalsports.us/sign-in"
      signUpUrl="https://connect.medalsports.us/sign-in"
      afterSignOutUrl="https://connect.medalsports.us/home"
    >
      {children}
    </ClerkProvider>
  );
}
