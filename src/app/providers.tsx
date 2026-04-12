'use client';

import { PriceProvider } from '@/contexts/PriceContext';
import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <PriceProvider>
        {children}
      </PriceProvider>
    </SessionProvider>
  );
}
