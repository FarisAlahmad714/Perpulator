'use client';

import { useState, useEffect } from 'react';
import { PlanFormValues } from '@/components/PlanForm';

export interface SavedPlan {
  id: string;
  name: string;
  values: PlanFormValues;
  savedAt: string;
}

const STORAGE_KEY_SAVED = 'perpulator_plans_saved';

export const usePlanStorage = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const loadSavedPlans = (): SavedPlan[] => {
    if (!isMounted) return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SAVED);
      if (!stored) return [];
      return JSON.parse(stored) as SavedPlan[];
    } catch {
      return [];
    }
  };

  const savePlan = (values: PlanFormValues) => {
    if (!isMounted) return;
    try {
      const saved = loadSavedPlans();
      const plan: SavedPlan = {
        id: `plan_${Date.now()}`,
        name: `${values.symbol} · $${values.capital.toLocaleString()} → +$${values.targetProfit.toLocaleString()}`,
        values,
        savedAt: new Date().toISOString(),
      };
      saved.push(plan);
      localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(saved));
    } catch (error) {
      console.error('Failed to save plan:', error);
    }
  };

  const deletePlan = (id: string) => {
    if (!isMounted) return;
    try {
      const filtered = loadSavedPlans().filter(p => p.id !== id);
      localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to delete plan:', error);
    }
  };

  return { savePlan, loadSavedPlans, deletePlan, isMounted };
};
