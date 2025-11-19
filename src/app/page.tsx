'use client';

import { useState, useEffect } from 'react';
import PositionForm from '@/components/PositionForm';
import PositionAdjustment from '@/components/PositionAdjustment';
import PriceIndicator from '@/components/PriceIndicator';
import { Position } from '@/types/position';
import { usePositionStorage } from '@/hooks/usePositionStorage';

export default function Home() {
  const [position, setPosition] = useState<Position | null>(null);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const { savePosition, loadPosition, clearPosition, isMounted } = usePositionStorage();

  // Load position from localStorage on mount
  useEffect(() => {
    if (isMounted) {
      const savedPosition = loadPosition();
      if (savedPosition) {
        setPosition(savedPosition);
        setShowAdjustment(true);
      }
    }
  }, [isMounted, loadPosition]);

  const handlePositionSubmit = (newPosition: Position) => {
    setPosition(newPosition);
    savePosition(newPosition);
    setShowAdjustment(true);
  };

  const handleReset = () => {
    setPosition(null);
    clearPosition();
    setShowAdjustment(false);
  };

  return (
    <>
      <PriceIndicator />
      <div className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 py-12 sm:py-16">
        <div className="w-full max-w-2xl flex-1">
          {/* Premium Hero Section */}
          <div className="mb-20 sm:mb-28">
            {/* Unified Heading Block */}
            <div className="space-y-2 sm:space-y-3">
              <h1 className="text-6xl sm:text-7xl font-700 text-white tracking-tighter leading-tight">
                Perpulator
              </h1>
              <p className="text-neutral text-sm sm:text-base tracking-widest font-600 uppercase letter-spacing">
                Professional Perpetual Futures Analysis
              </p>
            </div>

            {/* Subtle Spacer with Micro-detail */}
            <div className="mt-10 sm:mt-14 h-px bg-gradient-to-r from-transparent via-neutral/30 to-transparent" />
          </div>

          {/* How It Works Guide */}
          {!showAdjustment && (
            <div className="mb-20 sm:mb-28">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                {/* Step 1 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-neutral/20 flex items-center justify-center text-xs font-700 text-neutral">
                      1
                    </div>
                    <h3 className="text-label text-neutral">Enter Position</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                    Input your crypto symbol, entry price, position size, and leverage
                  </p>
                </div>

                {/* Step 2 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-neutral/20 flex items-center justify-center text-xs font-700 text-neutral">
                      2
                    </div>
                    <h3 className="text-label text-neutral">Set Targets</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                    Define your stop loss and take profit levels for risk management
                  </p>
                </div>

                {/* Step 3 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-neutral/20 flex items-center justify-center text-xs font-700 text-neutral">
                      3
                    </div>
                    <h3 className="text-label text-neutral">Analyze & Adjust</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                    View risk/reward ratios and test adjustments in real-time
                  </p>
                </div>
              </div>
            </div>
          )}

          {!showAdjustment ? (
            <PositionForm onSubmit={handlePositionSubmit} />
          ) : position ? (
            <div className="space-y-8">
              <PositionAdjustment position={position} />
              <button
                onClick={handleReset}
                className="btn-primary w-full"
              >
                Enter New Position
              </button>
            </div>
          ) : null}
        </div>

        <footer className="w-full mt-20 pt-12 border-t border-gray-800/50">
          <div className="flex flex-col gap-8">
            {/* CoinGecko Attribution */}
            <div className="text-center pb-8 border-b border-gray-800/30">
              <p className="text-xs text-gray-400">
                Data provided by{' '}
                <a
                  href="https://www.coingecko.com/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral hover:text-cyan-200 transition-colors"
                >
                  CoinGecko
                </a>
              </p>
            </div>

            {/* 50/50 Split: Logo & Company Info (Responsive) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12 items-center">
              {/* Logo Side */}
              <div className="flex justify-center">
                <img
                  src="/assets/logos/logo-primary.png"
                  alt="Perpulator"
                  className="h-32 sm:h-48 w-auto"
                />
              </div>

              {/* Company Info Side */}
              <div className="space-y-2 text-center sm:text-left">
                <h4 className="text-lg font-600 text-white">Perpulator</h4>
                <p className="text-xs text-gray-400">
                  Professional Perpetual Futures Analysis
                </p>
                <p className="text-xs text-gray-500 pt-3">
                  © 2025 Mithril Labs LLC
                </p>
                <p className="text-xs text-gray-500">
                  All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
