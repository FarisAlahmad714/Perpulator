'use client';

import { Position } from '@/types/position';
import { useState, useEffect } from 'react';

const STORAGE_KEY_ACTIVE = 'perpulator_position_active';
const STORAGE_KEY_SAVED = 'perpulator_positions_saved';

export const usePositionStorage = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Save the current active position
  const saveActivePosition = (position: Position | null) => {
    if (!isMounted) return;

    try {
      if (position) {
        const serialized = {
          ...position,
          timestamp: position.timestamp.toISOString(),
          savedAt: position.savedAt.toISOString(),
        };
        localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(serialized));
      } else {
        localStorage.removeItem(STORAGE_KEY_ACTIVE);
      }
    } catch (error) {
      console.error('Failed to save active position:', error);
    }
  };

  // Load the active position
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
    } catch (error) {
      console.error('Failed to load active position:', error);
      return null;
    }
  };

  // Save position to the saved positions list
  const savePosition = (position: Position) => {
    if (!isMounted) return;

    try {
      const saved = loadSavedPositions();
      const index = saved.findIndex(p => p.id === position.id);

      if (index >= 0) {
        saved[index] = position;
      } else {
        saved.push(position);
      }

      const serialized = saved.map(p => ({
        ...p,
        timestamp: p.timestamp.toISOString(),
        savedAt: p.savedAt.toISOString(),
      }));

      localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(serialized));
    } catch (error) {
      console.error('Failed to save position to list:', error);
    }
  };

  // Load all saved positions
  const loadSavedPositions = (): Position[] => {
    if (!isMounted) return [];

    try {
      const stored = localStorage.getItem(STORAGE_KEY_SAVED);
      if (!stored) return [];

      const parsed = JSON.parse(stored) as any[];
      return parsed.map(p => ({
        ...p,
        timestamp: new Date(p.timestamp),
        savedAt: new Date(p.savedAt),
      }));
    } catch (error) {
      console.error('Failed to load saved positions:', error);
      return [];
    }
  };

  // Delete a saved position
  const deletePosition = (id: string) => {
    if (!isMounted) return;

    try {
      const saved = loadSavedPositions();
      const filtered = saved.filter(p => p.id !== id);
      const serialized = filtered.map(p => ({
        ...p,
        timestamp: p.timestamp.toISOString(),
        savedAt: p.savedAt.toISOString(),
      }));

      localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(serialized));
    } catch (error) {
      console.error('Failed to delete position:', error);
    }
  };

  // Clear active position and all saved positions
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
    isMounted,
  };
};
