'use client';

import { usePriceContext } from '@/contexts/PriceContext';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function PriceIndicator() {
  const { isConnected, error, retry } = usePriceContext();
  const [showPulse, setShowPulse] = useState(true);

  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(() => {
        setShowPulse((prev) => !prev);
      }, 1200);
      return () => clearInterval(interval);
    }
  }, [isConnected]);

  if (isConnected) {
    return (
      <div className="fixed bottom-6 right-6 flex items-center gap-2 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-2 h-2 rounded-full bg-profit transition-opacity duration-500 ${
              showPulse ? 'opacity-100' : 'opacity-40'
            }`}
          />
          <span className="text-gray-400 font-500 tracking-wide">Live Prices</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-3 max-w-xs">
      <div className="flex items-start gap-2.5">
        <AlertCircle size={14} className="text-loss flex-shrink-0 mt-1" />
        <div className="flex-1 flex flex-col gap-1">
          <span className="text-xs font-600 text-loss tracking-wide uppercase">Connection Lost</span>
          {error && (
            <p className="text-xs text-gray-400 leading-relaxed">{error}</p>
          )}
        </div>
      </div>
      <button
        onClick={() => retry()}
        className="flex items-center justify-center gap-1.5 text-xs font-600 text-neutral hover:text-cyan-200 transition-colors py-2 px-3 rounded-lg border border-neutral/20 hover:border-neutral/40"
      >
        <RotateCcw size={12} />
        Retry
      </button>
    </div>
  );
}
