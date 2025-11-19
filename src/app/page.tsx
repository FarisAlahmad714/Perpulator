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
      <div className="flex items-center justify-center min-h-screen px-4 sm:px-6 py-12 sm:py-16">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-20 sm:mb-24">
            <h1 className="text-4xl sm:text-5xl font-700 mb-4 text-neutral">
              Perpulator
            </h1>
            <p className="text-gray-400 text-base sm:text-lg tracking-wide">
              Perpetual Futures Position Calculator
            </p>
          </div>

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
      </div>
    </>
  );
}
