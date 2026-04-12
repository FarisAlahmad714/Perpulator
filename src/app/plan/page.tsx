'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Save, ChevronLeft, Trash2 } from 'lucide-react';
import NavToggle from '@/components/NavToggle';
import PlanForm, { PlanFormValues } from '@/components/PlanForm';
import PlanCard from '@/components/PlanCard';
import PriceIndicator from '@/components/PriceIndicator';
import { generatePlanTiers, PlanTier, formatTimeframe } from '@/utils/planCalculations';
import { usePrice } from '@/contexts/PriceContext';
import { usePlanStorage, SavedPlan } from '@/hooks/usePlanStorage';

export default function PlanPage() {
  const [tiers, setTiers] = useState<PlanTier[] | null>(null);
  const [planValues, setPlanValues] = useState<PlanFormValues | null>(null);
  const [showSavedPlans, setShowSavedPlans] = useState(false);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  const { price: livePrice } = usePrice(planValues?.symbol ?? 'BTC');
  const { savePlan, loadSavedPlans, deletePlan, isMounted } = usePlanStorage();

  useEffect(() => {
    if (isMounted) {
      setSavedPlans(loadSavedPlans());
    }
  }, [isMounted]);

  const handleSubmit = (values: PlanFormValues) => {
    const generated = generatePlanTiers({
      capital: values.capital,
      riskPct: values.riskPct,
      targetProfit: values.targetProfit,
      timeframeDays: values.timeframeDays,
      volatility24h: values.volatility24h,
    });
    setTiers(generated);
    setPlanValues(values);
    setShowSavedPlans(false);
  };

  const handleReset = () => {
    setTiers(null);
    setPlanValues(null);
  };

  const handleSavePlan = () => {
    if (!planValues) return;
    savePlan(planValues);
    setSavedPlans(loadSavedPlans());
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };

  const handleLoadPlan = (plan: SavedPlan) => {
    const generated = generatePlanTiers({
      capital: plan.values.capital,
      riskPct: plan.values.riskPct,
      targetProfit: plan.values.targetProfit,
      timeframeDays: plan.values.timeframeDays,
      volatility24h: plan.values.volatility24h,
    });
    setTiers(generated);
    setPlanValues(plan.values);
    setShowSavedPlans(false);
  };

  const handleDeletePlan = (id: string) => {
    deletePlan(id);
    setSavedPlans(loadSavedPlans());
  };

  const handleShowSavedPlans = () => {
    setSavedPlans(loadSavedPlans());
    setShowSavedPlans(true);
  };

  return (
    <>
      <PriceIndicator />
      <div className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 py-12 sm:py-16">
        <div className="w-full max-w-2xl flex-1">
          {/* Header */}
          <div className="mb-20 sm:mb-28">
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {showSavedPlans && (
                    <button
                      onClick={() => setShowSavedPlans(false)}
                      className="text-neutral hover:text-cyan-300 transition-colors"
                      title="Back"
                    >
                      <ChevronLeft size={28} />
                    </button>
                  )}
                  <img
                    src="/assets/logos/header.png"
                    alt="Perpulator"
                    className="h-16 sm:h-20 w-auto"
                  />
                </div>

                <div className="flex items-center gap-3">
                  {/* Saved plans button — shown on form view */}
                  {!showSavedPlans && !tiers && savedPlans.length > 0 && (
                    <button
                      onClick={handleShowSavedPlans}
                      className="text-sm font-600 px-4 py-2 rounded-lg bg-neutral/10 border border-neutral/30 text-neutral hover:bg-neutral/20 hover:border-neutral/50 transition-all"
                    >
                      {savedPlans.length} Saved
                    </button>
                  )}
                  {/* New Plan button — shown on results view */}
                  {tiers && (
                    <button
                      onClick={handleReset}
                      className="flex items-center gap-2 text-sm font-600 px-4 py-2 rounded-lg bg-neutral/10 border border-neutral/30 text-neutral hover:bg-neutral/20 hover:border-neutral/50 transition-all"
                    >
                      <RefreshCw size={14} />
                      New Plan
                    </button>
                  )}
                </div>
              </div>

              <p className="text-neutral text-sm sm:text-base tracking-widest font-600 uppercase letter-spacing">
                {showSavedPlans
                  ? `${savedPlans.length} plan${savedPlans.length !== 1 ? 's' : ''}`
                  : 'Probability Planner'}
              </p>
              {!showSavedPlans && <NavToggle active="plan" />}
            </div>
            <div className="mt-10 sm:mt-14 h-px bg-gradient-to-r from-transparent via-neutral/30 to-transparent" />
          </div>

          {/* Saved Plans List */}
          {showSavedPlans ? (
            <div className="space-y-3 animate-fade-in-up">
              {savedPlans.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-12">No saved plans yet.</p>
              ) : (
                savedPlans.map(plan => (
                  <div
                    key={plan.id}
                    className="metric-card flex items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-600 text-sm truncate">{plan.name}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        {plan.values.riskPct}% risk · {formatTimeframe(plan.values.timeframeDays)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleLoadPlan(plan)}
                        className="text-xs font-600 px-3 py-1.5 rounded-md bg-neutral/10 border border-neutral/30 text-neutral hover:bg-neutral/20 transition-all"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan.id)}
                        className="text-gray-500 hover:text-loss transition-colors p-1.5"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          ) : !tiers ? (
            <PlanForm onSubmit={handleSubmit} />

          ) : (
            planValues && (
              <div className="animate-fade-in-up">
                {/* Plan summary + live price */}
                <div className="mb-10">
                  <div className="flex items-baseline justify-between flex-wrap gap-3 mb-3">
                    <p className="text-gray-400 text-sm leading-relaxed">
                      <span className="text-white font-600">{planValues.symbol}</span>
                      {' · '}
                      <span className="text-white font-600">
                        ${planValues.capital.toLocaleString()}
                      </span>{' '}
                      capital
                      {' · '}
                      <span className="text-white font-600">{planValues.riskPct}%</span>{' '}
                      risk/trade
                      {' · target '}
                      <span className="text-profit font-600">
                        +${planValues.targetProfit.toLocaleString()}
                      </span>{' '}
                      in{' '}
                      <span className="text-white font-600">
                        {formatTimeframe(planValues.timeframeDays)}
                      </span>
                    </p>
                    {livePrice?.price && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-neutral font-700 text-sm">
                          ${livePrice.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </span>
                        {livePrice.change24h !== 0 && (
                          <span className={`text-xs font-600 ${livePrice.change24h >= 0 ? 'text-profit' : 'text-loss'}`}>
                            {livePrice.change24h >= 0 ? '+' : ''}{livePrice.change24h.toFixed(2)}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Low Leverage Section */}
                <div className="mb-10">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-label">Low Leverage</span>
                    <span className="text-xs font-600 text-gray-600">· 2–10x</span>
                    <div className="flex-1 h-px bg-slate-700/50" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {tiers.filter(t => t.leverageCategory === 'low').map((tier, i) => (
                      <PlanCard
                        key={tier.id}
                        tier={tier}
                        timeframeDays={planValues.timeframeDays}
                        index={i}
                      />
                    ))}
                  </div>
                </div>

                {/* High Leverage Section */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-label">High Leverage</span>
                    <span className="text-xs font-600 text-gray-600">· 15–50x</span>
                    <div className="flex-1 h-px bg-slate-700/50" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {tiers.filter(t => t.leverageCategory === 'high').map((tier, i) => (
                      <PlanCard
                        key={tier.id}
                        tier={tier}
                        timeframeDays={planValues.timeframeDays}
                        index={i + 2}
                      />
                    ))}
                  </div>
                </div>

                {/* Save + New Plan buttons */}
                <div className="flex gap-4 mt-8">
                  <button
                    onClick={handleSavePlan}
                    className="flex-1 btn-primary flex items-center justify-center gap-2 bg-neutral/10 border border-neutral/30 text-neutral hover:bg-neutral/20 hover:border-neutral/50"
                  >
                    <Save size={18} />
                    <span>Save Plan</span>
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex-1 btn-primary"
                  >
                    New Plan
                  </button>
                </div>

                {/* Disclaimer */}
                <p className="text-xs text-gray-500 mt-8 leading-relaxed">
                  Not financial advice. These are mathematical projections based on fixed win
                  rates and R:R ratios. Real trading involves variance, fees, and market
                  conditions not captured here.
                </p>

                {/* Save success toast */}
                {showSaveSuccess && (
                  <div className="fixed bottom-8 right-8 bg-profit/20 border border-profit rounded-lg px-6 py-4 text-profit font-600 animate-fade-in-up">
                    Plan saved successfully!
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <footer className="w-full mt-20 pt-12 border-t border-gray-800/50">
          <div className="flex flex-col gap-8">
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
            <div className="flex flex-col items-center text-center space-y-2">
              <img
                src="/assets/logos/logo-primary2.png"
                alt="Perpulator"
                className="h-32 sm:h-48 w-auto"
              />
              <p className="text-xs text-gray-400">Professional Perpetual Futures Analysis</p>
              <p className="text-xs text-gray-500 pt-3">© 2025 Mithril Labs LLC</p>
              <p className="text-xs text-gray-500">All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
