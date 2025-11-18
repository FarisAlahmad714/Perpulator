'use client';

import { PriceProvider } from '@/contexts/PriceContext';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PriceProvider>
      {children}
    </PriceProvider>
  );
}
