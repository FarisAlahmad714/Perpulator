'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import NavToggle from '@/components/NavToggle';
import PositionForm from '@/components/PositionForm';
import PositionAdjustment from '@/components/PositionAdjustment';
import PriceIndicator from '@/components/PriceIndicator';
import SavedPositionsList from '@/components/SavedPositionsList';
import AuthButton from '@/components/AuthButton';
import { Position } from '@/types/position';
import { usePositionStorage } from '@/hooks/usePositionStorage';
import { Save, HelpCircle, ChevronDown } from 'lucide-react';

export default function Home() {
  const [position, setPosition] = useState<Position | null>(null);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [savedPositions, setSavedPositions] = useState<Position[]>([]);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [pendingLoad, setPendingLoad] = useState<Position | null>(null);
  const {
    saveActivePosition,
    loadActivePosition,
    savePosition,
    loadSavedPositions,
    deletePosition,
    refreshFromCloud,
    isMounted,
    isAuthenticated,
  } = usePositionStorage();

  // Load from localStorage on mount
  useEffect(() => {
    if (isMounted) {
      const activePosition = loadActivePosition();
      const saved = loadSavedPositions();
      setSavedPositions(saved);
      if (activePosition) {
        setPosition(activePosition);
        setShowAdjustment(true);
        setIsSaved(saved.some(p => p.id === activePosition.id));
      }
    }
  }, [isMounted, loadActivePosition, loadSavedPositions]);

  // When user signs in, pull their positions from DB and merge into the UI
  useEffect(() => {
    if (!isAuthenticated || !isMounted) return;
    refreshFromCloud().then((cloudPositions) => {
      if (cloudPositions && cloudPositions.length > 0) {
        setSavedPositions(cloudPositions);
      }
    });
  }, [isAuthenticated, isMounted]);

  const handlePositionSubmit = (newPosition: Position) => {
    setPosition(newPosition);
    saveActivePosition(newPosition);
    setShowAdjustment(true);
    setIsSaved(false);
  };

  const handlePositionUpdate = (updatedPosition: Position) => {
    setPosition(updatedPosition);
    saveActivePosition(updatedPosition);
    setIsSaved(false);
  };

  const handleSavePosition = () => {
    if (!position) return;
    savePosition(position);
    setSavedPositions(loadSavedPositions());
    setIsSaved(true);
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };

  // Performs the actual load — called directly or after confirmation
  const doLoadPosition = (loadedPosition: Position) => {
    setPosition(loadedPosition);
    saveActivePosition(loadedPosition);
    setShowAdjustment(true);
    setIsSaved(true);
    setPendingLoad(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoadPosition = (loadedPosition: Position) => {
    // Guard: warn if there's an active unsaved position
    if (showAdjustment && !isSaved) {
      setPendingLoad(loadedPosition);
      return;
    }
    doLoadPosition(loadedPosition);
  };

  const handleDeletePosition = (id: string) => {
    deletePosition(id);
    setSavedPositions(loadSavedPositions());
    // If the deleted position was the active one, mark as unsaved
    if (position?.id === id) setIsSaved(false);
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
    setIsSaved(false);
  };

  return (
    <>
      {/* Load Confirmation Modal */}
      {pendingLoad && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
          onClick={() => setPendingLoad(null)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6"
            style={{ backgroundColor: '#0F1535', border: '1px solid rgba(148,163,184,0.15)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-600 text-lg mb-2">Load this position?</h3>
            <p className="text-gray-400 text-sm mb-1">
              <span className="text-neutral">{pendingLoad.name}</span>
            </p>
            <p className="text-gray-500 text-sm mb-6">
              Your current position has unsaved changes that will be lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingLoad(null)}
                className="flex-1 py-3 px-4 rounded-lg border border-slate-600/60 text-gray-400 font-600 text-sm hover:border-slate-500 hover:text-white transition-all"
              >
                Keep Working
              </button>
              <button
                onClick={() => doLoadPosition(pendingLoad)}
                className="flex-1 py-3 px-4 rounded-lg bg-neutral/20 border border-neutral/60 text-neutral font-600 text-sm hover:bg-neutral/30 transition-all"
              >
                Load Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <PriceIndicator />
      <div className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 py-12 sm:py-16">
        <div className="w-full max-w-2xl flex-1">
          {/* Premium Hero Section */}
          <div className="mb-20 sm:mb-28">
            {/* Unified Heading Block */}
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <h1 className="text-6xl sm:text-7xl font-700 text-white tracking-tighter leading-tight">
                  <img
                    src="/assets/logos/header.png"
                    alt="Perpulator"
                    className="h-16 sm:h-20 w-auto"
                  />
                </h1>
                <AuthButton />
              </div>
              <p className="text-neutral text-sm sm:text-base tracking-widest font-600 uppercase letter-spacing">
                Professional Perpetual Futures Analysis
              </p>
              <NavToggle active="calc" />
            </div>

            {/* Subtle Spacer with Micro-detail */}
            <div className="mt-10 sm:mt-14 h-px bg-gradient-to-r from-transparent via-neutral/30 to-transparent" />
          </div>

          {!showAdjustment ? (
            <>
              {/* How It Works - Collapsible */}
              <div className="mb-12 sm:mb-16">
                <button
                  onClick={() => setShowHowItWorks(!showHowItWorks)}
                  className="flex items-center gap-2 text-sm font-600 text-gray-400 hover:text-neutral transition-colors"
                >
                  <HelpCircle size={16} />
                  <span>How It Works</span>
                  <ChevronDown size={14} className={`transition-transform ${showHowItWorks ? 'rotate-180' : ''}`} />
                </button>

                {showHowItWorks && (
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-8 animate-fade-in-up">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-neutral/20 flex items-center justify-center text-xs font-700 text-neutral">1</div>
                        <h3 className="text-label text-neutral">Enter Position</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">Input your crypto symbol, entry price, position size, and leverage</p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-neutral/20 flex items-center justify-center text-xs font-700 text-neutral">2</div>
                        <h3 className="text-label text-neutral">Set Targets</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">Define your stop loss and take profit levels for risk management</p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-neutral/20 flex items-center justify-center text-xs font-700 text-neutral">3</div>
                        <h3 className="text-label text-neutral">Analyze & Adjust</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">View risk/reward ratios and test adjustments in real-time</p>
                    </div>
                  </div>
                )}
              </div>

              <PositionForm onSubmit={handlePositionSubmit} />
            </>
          ) : position ? (
            <div className="space-y-8">
              <PositionAdjustment position={position} onPositionUpdate={handlePositionUpdate} onReset={handleNewPosition} />

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

              {/* Sign-in nudge for guests */}
              {!isAuthenticated && (
                <p className="text-center text-xs text-gray-500">
                  <button
                    onClick={() => signIn()}
                    className="text-neutral hover:underline"
                  >
                    Sign in
                  </button>{' '}
                  to sync your positions across devices
                </p>
              )}

              {/* Save Success Message */}
              {showSaveSuccess && (
                <div className="fixed bottom-8 right-8 bg-profit/20 border border-profit rounded-lg px-6 py-4 text-profit font-600 animate-fade-in-up">
                  Position saved successfully!
                </div>
              )}
            </div>
          ) : null}

          {/* Saved Positions Section */}
          {savedPositions.length > 0 && (
            <div className="mt-20 pt-12 border-t border-gray-800/50">
              <p className="text-label mb-8">
                Saved Positions ({savedPositions.length})
              </p>
              <SavedPositionsList
                positions={savedPositions}
                onLoadPosition={handleLoadPosition}
                onDeletePosition={handleDeletePosition}
                onRenamePosition={handleRenamePosition}
              />
            </div>
          )}
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

            {/* Company Info - Centered */}
            <div className="flex flex-col items-center text-center space-y-2">
              <img
                src="/assets/logos/logo-primary2.png"
                alt="Perpulator"
                className="h-32 sm:h-48 w-auto"
              />
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
        </footer>
      </div>
    </>
  );
}
