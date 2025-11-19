'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback, useMemo } from 'react';

export interface LivePrice {
  symbol: string;
  price: number;
  change24h: number;
  timestamp: number;
  connected: boolean;
  lastUpdated: Date;
}

interface PriceContextType {
  prices: Map<string, LivePrice>;
  getPrice: (symbol: string) => LivePrice | null;
  isConnected: boolean;
  error: string | null;
  trackSymbol: (symbol: string) => void;
  retry: () => void;
  failedAttempts: number;
  lastError: Error | null;
}

const PriceContext = createContext<PriceContextType | undefined>(undefined);
const POLLING_INTERVAL = 3000;

export function PriceProvider({ children }: { children: ReactNode }) {
  const [prices, setPrices] = useState<Map<string, LivePrice>>(new Map());
  const [isConnected, setIsConnected] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);

  // Use ref to track symbols - no re-renders when symbols change
  const trackedSymbolsRef = useRef<Set<string>>(new Set(['BTC', 'ETH']));

  // Track symbol without triggering re-renders (memoized)
  const trackSymbol = useCallback((symbol: string) => {
    trackedSymbolsRef.current.add(symbol);
  }, []);

  // Main fetch function with enhanced error handling
  const fetchPrices = useCallback(async () => {
    const symbols = Array.from(trackedSymbolsRef.current);

    if (symbols.length === 0) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`/api/prices?symbols=${symbols.join(',')}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      setPrices((prev) => {
        const updated = new Map(prev);

        Object.entries(data).forEach(([symbol, priceData]: [string, any]) => {
          updated.set(symbol, {
            symbol,
            price: priceData.price,
            change24h: priceData.change24h,
            timestamp: Date.now(),
            connected: true,
            lastUpdated: new Date(),
          });
        });

        return updated;
      });

      setIsConnected(true);
      setError(null);
      setFailedAttempts(0);
      setLastError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      // Determine error message
      let errorMessage = 'Unable to fetch live prices';
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout - check your connection';
      } else if (error instanceof TypeError) {
        errorMessage = 'Network error - no internet connection';
      } else if (error.message.includes('HTTP')) {
        errorMessage = `Server error: ${error.message}`;
      }

      setError(errorMessage);
      setIsConnected(false);
      setFailedAttempts((prev) => prev + 1);
      setLastError(error);
      console.error('Price fetch error:', error);
    }
  }, []);

  // Retry function
  const retry = useCallback(() => {
    setFailedAttempts(0);
    setLastError(null);
    setError(null);
    fetchPrices();
  }, [fetchPrices]);

  // Set up polling - only once on mount
  useEffect(() => {
    // Fetch immediately
    fetchPrices();

    // Set up interval
    const interval = setInterval(fetchPrices, POLLING_INTERVAL);

    // Cleanup
    return () => clearInterval(interval);
  }, []); // Empty dependency array - runs once

  const getPrice = useCallback((symbol: string): LivePrice | null => {
    return prices.get(symbol) || null;
  }, [prices]);

  const value = useMemo<PriceContextType>(() => ({
    prices,
    getPrice,
    isConnected,
    error,
    trackSymbol,
    retry,
    failedAttempts,
    lastError,
  }), [prices, getPrice, isConnected, error, trackSymbol, retry, failedAttempts, lastError]);

  return (
    <PriceContext.Provider value={value}>
      {children}
    </PriceContext.Provider>
  );
}

export function usePriceContext() {
  const context = useContext(PriceContext);
  if (context === undefined) {
    throw new Error('usePriceContext must be used within PriceProvider');
  }
  return context;
}

export function usePrice(symbol: string) {
  const { prices, isConnected, error, trackSymbol } = usePriceContext();
  const [price, setPrice] = useState<LivePrice | null>(null);

  // Track this symbol
  useEffect(() => {
    trackSymbol(symbol);
  }, [symbol, trackSymbol]);

  // Update when prices change
  useEffect(() => {
    const currentPrice = prices.get(symbol);
    if (currentPrice) {
      setPrice(currentPrice);
    }
  }, [symbol, prices]);

  return price;
}
