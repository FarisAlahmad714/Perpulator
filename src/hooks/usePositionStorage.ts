'use client';

import { Position } from '@/types/position';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

const STORAGE_KEY_ACTIVE = 'perpulator_position_active';
const STORAGE_KEY_SAVED = 'perpulator_positions_saved';

export const usePositionStorage = () => {
  const [isMounted, setIsMounted] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ─── localStorage helpers ────────────────────────────────────────────────────

  const saveActivePosition = (position: Position | null) => {
    if (!isMounted) return;
    try {
      if (position) {
        localStorage.setItem(
          STORAGE_KEY_ACTIVE,
          JSON.stringify({
            ...position,
            timestamp: position.timestamp.toISOString(),
            savedAt: position.savedAt.toISOString(),
          })
        );
      } else {
        localStorage.removeItem(STORAGE_KEY_ACTIVE);
      }
    } catch (error) {
      console.error('Failed to save active position:', error);
    }
  };

  const loadActivePosition = (): Position | null => {
    if (!isMounted) return null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ACTIVE);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        timestamp: new Date(parsed.timestamp),
        savedAt: new Date(parsed.savedAt),
      };
    } catch {
      return null;
    }
  };

  const loadSavedPositions = (): Position[] => {
    if (!isMounted) return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SAVED);
      if (!stored) return [];
      return (JSON.parse(stored) as any[]).map((p) => ({
        ...p,
        timestamp: new Date(p.timestamp),
        savedAt: new Date(p.savedAt),
      }));
    } catch {
      return [];
    }
  };

  // ─── Cloud sync helpers ──────────────────────────────────────────────────────

  // Pull positions from DB → overwrite localStorage, return parsed list
  const refreshFromCloud = async (): Promise<Position[] | null> => {
    if (!session?.user) return null;
    try {
      const res = await fetch('/api/positions');
      if (!res.ok) return null;
      const data: any[] = await res.json();
      const parsed: Position[] = data.map((p) => ({
        ...p,
        timestamp: new Date(p.timestamp),
        savedAt: new Date(p.savedAt),
      }));
      // Keep localStorage in sync
      localStorage.setItem(
        STORAGE_KEY_SAVED,
        JSON.stringify(
          parsed.map((p) => ({
            ...p,
            timestamp: p.timestamp.toISOString(),
            savedAt: p.savedAt.toISOString(),
          }))
        )
      );
      return parsed;
    } catch {
      return null;
    }
  };

  // ─── Main API ────────────────────────────────────────────────────────────────

  const savePosition = (position: Position) => {
    if (!isMounted) return;

    // localStorage (synchronous — instant UI response)
    try {
      const saved = loadSavedPositions();
      const idx = saved.findIndex((p) => p.id === position.id);
      if (idx >= 0) saved[idx] = position;
      else saved.push(position);
      localStorage.setItem(
        STORAGE_KEY_SAVED,
        JSON.stringify(
          saved.map((p) => ({
            ...p,
            timestamp: p.timestamp.toISOString(),
            savedAt: p.savedAt.toISOString(),
          }))
        )
      );
    } catch (error) {
      console.error('Failed to save position locally:', error);
    }

    // Cloud (fire-and-forget — doesn't block UI)
    if (session?.user) {
      fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...position,
          timestamp: position.timestamp.toISOString(),
          savedAt: position.savedAt.toISOString(),
        }),
      }).catch(console.error);
    }
  };

  const deletePosition = (id: string) => {
    if (!isMounted) return;

    // localStorage
    try {
      const filtered = loadSavedPositions().filter((p) => p.id !== id);
      localStorage.setItem(
        STORAGE_KEY_SAVED,
        JSON.stringify(
          filtered.map((p) => ({
            ...p,
            timestamp: p.timestamp.toISOString(),
            savedAt: p.savedAt.toISOString(),
          }))
        )
      );
    } catch (error) {
      console.error('Failed to delete position locally:', error);
    }

    // Cloud
    if (session?.user) {
      fetch(`/api/positions/${id}`, { method: 'DELETE' }).catch(console.error);
    }
  };

  const clearAll = () => {
    if (!isMounted) return;
    try {
      localStorage.removeItem(STORAGE_KEY_ACTIVE);
      localStorage.removeItem(STORAGE_KEY_SAVED);
    } catch (error) {
      console.error('Failed to clear positions:', error);
    }
  };

  return {
    saveActivePosition,
    loadActivePosition,
    savePosition,
    loadSavedPositions,
    deletePosition,
    clearAll,
    refreshFromCloud,
    isMounted,
    isAuthenticated: !!session?.user,
  };
};
