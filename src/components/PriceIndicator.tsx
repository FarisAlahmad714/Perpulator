'use client';

import { usePriceContext } from '@/contexts/PriceContext';
import { Activity, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function PriceIndicator() {
  const { isConnected, error } = usePriceContext();
  const [pulseAnimation, setPulseAnimation] = useState(true);

  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(() => {
        setPulseAnimation((prev) => !prev);
      }, 800);
      return () => clearInterval(interval);
    }
  }, [isConnected]);

  if (isConnected) {
    return (
      <div className="fixed bottom-6 right-6 flex items-center gap-2 bg-green-900/20 border border-green-500/50 rounded-lg px-4 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full bg-green-400 ${
              pulseAnimation ? 'animate-pulse' : ''
            }`}
          />
          <span className="text-sm font-semibold text-green-400">Live Prices (3s)</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 flex items-center gap-2 bg-red-900/20 border border-red-500/50 rounded-lg px-4 py-2 backdrop-blur-sm">
      <AlertCircle size={16} className="text-red-400" />
      <div className="flex flex-col gap-0">
        <span className="text-sm font-semibold text-red-400">Prices Offline</span>
        {error && <span className="text-xs text-red-300 opacity-75">Check connection</span>}
      </div>
    </div>
  );
}
