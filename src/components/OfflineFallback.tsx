'use client';

import { usePriceContext } from '@/contexts/PriceContext';
import { AlertTriangle, Wifi, WifiOff, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function OfflineFallback() {
  const { isConnected, error, retry, failedAttempts } = usePriceContext();
  const [isNetworkOnline, setIsNetworkOnline] = useState(true);

  // Check browser network status
  useEffect(() => {
    setIsNetworkOnline(navigator.onLine);

    const handleOnline = () => setIsNetworkOnline(true);
    const handleOffline = () => setIsNetworkOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Only show if prices are not connected
  if (isConnected) {
    return null;
  }

  const showNetworkWarning = !isNetworkOnline;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-red-500/30 rounded-lg p-6 sm:p-8 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          {showNetworkWarning ? (
            <>
              <WifiOff size={32} className="text-red-400 flex-shrink-0" />
              <h2 className="text-xl sm:text-2xl font-bold text-red-400">No Internet</h2>
            </>
          ) : (
            <>
              <AlertTriangle size={32} className="text-yellow-400 flex-shrink-0" />
              <h2 className="text-xl sm:text-2xl font-bold text-yellow-400">Prices Unavailable</h2>
            </>
          )}
        </div>

        {/* Description */}
        <p className="text-gray-300 mb-2">
          {showNetworkWarning
            ? 'Your device is currently offline. Price updates require an internet connection.'
            : 'Unable to fetch live prices from the server.'}
        </p>

        {/* Error Details */}
        {error && !showNetworkWarning && (
          <div className="bg-red-900/20 border border-red-500/30 rounded p-3 mb-4">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Failed Attempts */}
        {failedAttempts > 2 && !showNetworkWarning && (
          <div className="bg-orange-900/20 border border-orange-500/30 rounded p-3 mb-4">
            <p className="text-xs sm:text-sm text-orange-300">
              ⚠ Server is not responding. This may be a temporary issue. Please try again later.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => retry()}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            <RotateCcw size={18} />
            Retry Connection
          </button>

          {showNetworkWarning && (
            <p className="text-center text-xs text-gray-500">
              Reconnect to the internet and try again
            </p>
          )}

          {!showNetworkWarning && failedAttempts > 2 && (
            <p className="text-center text-xs text-gray-500">
              If the problem persists, try refreshing the page
            </p>
          )}
        </div>

        {/* Tips */}
        <div className="mt-6 pt-6 border-t border-gray-700">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Troubleshooting tips:</h3>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Check your internet connection</li>
            <li>• Disable browser extensions that block requests</li>
            <li>• Try clearing your browser cache</li>
            <li>• Use a different browser if the problem persists</li>
          </ul>
        </div>

        {/* Note about functionality */}
        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded">
          <p className="text-xs sm:text-sm text-blue-300">
            <strong>Note:</strong> You can still use calculations with manual price entry, but live price updates will be unavailable until your connection is restored.
          </p>
        </div>
      </div>
    </div>
  );
}
