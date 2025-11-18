'use client';

import { useState } from 'react';
import PositionForm from '@/components/PositionForm';
import PositionAdjustment from '@/components/PositionAdjustment';
import PriceIndicator from '@/components/PriceIndicator';
import { Position } from '@/types/position';

export default function Home() {
  const [position, setPosition] = useState<Position | null>(null);
  const [showAdjustment, setShowAdjustment] = useState(false);

  const handlePositionSubmit = (newPosition: Position) => {
    setPosition(newPosition);
    setShowAdjustment(true);
  };

  const handleReset = () => {
    setPosition(null);
    setShowAdjustment(false);
  };

  return (
    <>
      <PriceIndicator />
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-neutral to-blue-400 bg-clip-text text-transparent">
              Perpulator
            </h1>
            <p className="text-gray-400 text-lg">
              Perpetual Futures Position Calculator
            </p>
          </div>

          {!showAdjustment ? (
            <PositionForm onSubmit={handlePositionSubmit} />
          ) : position ? (
            <div className="space-y-4">
              <PositionAdjustment position={position} />
              <button
                onClick={handleReset}
                className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-all duration-300"
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
