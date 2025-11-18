'use client';

import { usePriceContext } from '@/contexts/PriceContext';
import { Activity, AlertCircle, RotateCcw } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function PriceIndicator() {
  const { isConnected, error, retry, failedAttempts } = usePriceContext();
  const [pulseAnimation, setPulseAnimation] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

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
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 flex items-center gap-2 bg-green-900/20 border border-green-500/50 rounded-lg px-3 py-2 sm:px-4 backdrop-blur-sm text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full bg-green-400 ${
              pulseAnimation ? 'animate-pulse' : ''
            }`}
          />
          <span className="font-semibold text-green-400">Live Prices (3s)</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 flex flex-col gap-2 bg-red-900/20 border border-red-500/50 rounded-lg px-3 py-2 sm:px-4 backdrop-blur-sm text-xs sm:text-sm max-w-xs">
      <div className="flex items-center gap-2">
        <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
        <div className="flex-1 flex flex-col gap-0">
          <span className="font-semibold text-red-400">Prices Offline</span>
          {error && <span className="text-xs text-red-300 opacity-75">{error}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 pl-6">
        <button
          onClick={() => retry()}
          className="flex items-center gap-1 bg-red-600/40 hover:bg-red-600/60 text-red-300 hover:text-red-200 px-2 py-1 rounded text-xs font-medium transition-colors"
        >
          <RotateCcw size={12} />
          Retry
        </button>
        {failedAttempts > 0 && (
          <span className="text-xs text-red-400/75">
            {failedAttempts > 3 ? '⚠ Multiple failures' : `Attempt ${failedAttempts}`}
          </span>
        )}
      </div>
    </div>
  );
}
