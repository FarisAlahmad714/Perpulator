'use client';

import { useState, useEffect } from 'react';
import PositionForm from '@/components/PositionForm';
import PositionAdjustment from '@/components/PositionAdjustment';
import PriceIndicator from '@/components/PriceIndicator';
import SavedPositionsList from '@/components/SavedPositionsList';
import { Position } from '@/types/position';
import { usePositionStorage } from '@/hooks/usePositionStorage';
import { Save, ChevronLeft } from 'lucide-react';

export default function Home() {
  const [position, setPosition] = useState<Position | null>(null);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [showSavedPositions, setShowSavedPositions] = useState(false);
  const [savedPositions, setSavedPositions] = useState<Position[]>([]);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const {
    saveActivePosition,
    loadActivePosition,
    savePosition,
    loadSavedPositions,
    deletePosition,
    isMounted
  } = usePositionStorage();

  // Load active position from localStorage on mount
  useEffect(() => {
    if (isMounted) {
      const savedPosition = loadActivePosition();
      if (savedPosition) {
        setPosition(savedPosition);
        setShowAdjustment(true);
      }
      // Load list of saved positions
      setSavedPositions(loadSavedPositions());
    }
  }, [isMounted, loadActivePosition, loadSavedPositions]);

  const handlePositionSubmit = (newPosition: Position) => {
    setPosition(newPosition);
    saveActivePosition(newPosition);
    setShowAdjustment(true);
    setShowSavedPositions(false);
  };

  const handlePositionUpdate = (updatedPosition: Position) => {
    setPosition(updatedPosition);
    saveActivePosition(updatedPosition);
  };

  const handleSavePosition = () => {
    if (!position) return;
    savePosition(position);
    setSavedPositions(loadSavedPositions());
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };

  const handleLoadPosition = (loadedPosition: Position) => {
    setPosition(loadedPosition);
    saveActivePosition(loadedPosition);
    setShowAdjustment(true);
    setShowSavedPositions(false);
  };

  const handleDeletePosition = (id: string) => {
    deletePosition(id);
    setSavedPositions(loadSavedPositions());
  };

  const handleRenamePosition = (id: string, newName: string) => {
    const saved = loadSavedPositions();
    const index = saved.findIndex(p => p.id === id);
    if (index >= 0) {
      saved[index].customName = newName;
      savePosition(saved[index]);
      setSavedPositions(loadSavedPositions());
    }
  };

  const handleNewPosition = () => {
    setPosition(null);
    saveActivePosition(null);
    setShowAdjustment(false);
    setShowSavedPositions(false);
  };

  const handleShowSavedPositions = () => {
    setSavedPositions(loadSavedPositions());
    setShowSavedPositions(true);
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {showSavedPositions && (
                    <button
                      onClick={() => setShowSavedPositions(false)}
                      className="text-neutral hover:text-cyan-300 transition-colors"
                      title="Back to position"
                    >
                      <ChevronLeft size={28} />
                    </button>
                  )}
                  <h1 className="text-6xl sm:text-7xl font-700 text-white tracking-tighter leading-tight">
                    {showSavedPositions ? 'Saved Positions' : 'Perpulator'}
                  </h1>
                </div>

                {/* View Saved Positions Button - Top Right */}
                {!showSavedPositions && !showAdjustment && savedPositions.length > 0 && (
                  <button
                    onClick={handleShowSavedPositions}
                    className="text-sm font-600 px-4 py-2 rounded-lg bg-neutral/10 border border-neutral/30 text-neutral hover:bg-neutral/20 hover:border-neutral/50 transition-all"
                  >
                    {savedPositions.length} Saved
                  </button>
                )}
              </div>
              <p className="text-neutral text-sm sm:text-base tracking-widest font-600 uppercase letter-spacing">
                {showSavedPositions ? `${savedPositions.length} position${savedPositions.length !== 1 ? 's' : ''}` : 'Professional Perpetual Futures Analysis'}
              </p>
            </div>

            {/* Subtle Spacer with Micro-detail */}
            <div className="mt-10 sm:mt-14 h-px bg-gradient-to-r from-transparent via-neutral/30 to-transparent" />
          </div>

          {/* Show Saved Positions */}
          {showSavedPositions ? (
            <SavedPositionsList
              positions={savedPositions}
              onLoadPosition={handleLoadPosition}
              onDeletePosition={handleDeletePosition}
              onRenamePosition={handleRenamePosition}
            />
          ) : !showAdjustment ? (
            <>
              {/* How It Works Guide */}
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

              <PositionForm onSubmit={handlePositionSubmit} />
            </>
          ) : position ? (
            <div className="space-y-8">
              <PositionAdjustment position={position} onPositionUpdate={handlePositionUpdate} />

              {/* Save Position & New Position Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleSavePosition}
                  className="flex-1 btn-primary flex items-center justify-center gap-2 bg-neutral/10 border border-neutral/30 text-neutral hover:bg-neutral/20 hover:border-neutral/50"
                >
                  <Save size={20} />
                  <span>Save Position</span>
                </button>
                <button
                  onClick={handleNewPosition}
                  className="flex-1 btn-primary"
                >
                  Enter New Position
                </button>
              </div>

              {/* Save Success Message */}
              {showSaveSuccess && (
                <div className="fixed bottom-8 right-8 bg-profit/20 border border-profit rounded-lg px-6 py-4 text-profit font-600 animate-fade-in-up">
                  Position saved successfully!
                </div>
              )}
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
