'use client';

import { Position } from '@/types/position';
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'perpulator_position';

export const usePositionStorage = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const savePosition = (position: Position | null) => {
    if (!isMounted) return;

    try {
      if (position) {
        const serialized = {
          ...position,
          timestamp: position.timestamp.toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to save position:', error);
    }
  };

  const loadPosition = (): Position | null => {
    if (!isMounted) return null;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        timestamp: new Date(parsed.timestamp),
      };
    } catch (error) {
      console.error('Failed to load position:', error);
      return null;
    }
  };

  const clearPosition = () => {
    if (!isMounted) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear position:', error);
    }
  };

  return {
    savePosition,
    loadPosition,
    clearPosition,
    isMounted,
  };
};
