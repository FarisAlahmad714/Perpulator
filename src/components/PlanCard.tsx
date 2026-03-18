'use client';

import { PlanTier } from '@/utils/planCalculations';

interface PlanCardProps {
  tier: PlanTier;
  timeframeDays: number;
  index: number;
}

const REALISM_STYLES = {
  green: {
    border: 'border-profit/30',
    bg: 'bg-profit/10',
    text: 'text-profit',
    dot: 'bg-profit',
  },
  yellow: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
  },
  red: {
    border: 'border-loss/30',
    bg: 'bg-loss/10',
    text: 'text-loss',
    dot: 'bg-loss',
  },
};

export default function PlanCard({ tier, index }: PlanCardProps) {
  const realism = REALISM_STYLES[tier.realism];
  const delay = index * 80;

  const tradeFrequency =
    tier.tradesPerDay < 0.5
      ? `~${Math.round(1 / tier.tradesPerDay)} days/trade`
      : tier.tradesPerDay < 1
      ? `~${(1 / tier.tradesPerDay).toFixed(1)} days/trade`
      : `${tier.tradesPerDay.toFixed(1)} trades/day`;

  const winRateColor =
    tier.realism === 'green'
      ? 'text-profit'
      : tier.realism === 'yellow'
      ? 'text-amber-400'
      : 'text-loss';

  return (
    <div
      className="metric-card animate-fade-in-up"
      style={{
        animationDelay: `${delay}ms`,
        borderTop: `2px solid ${tier.accentColor}`,
      }}
    >
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p
              className="text-xs font-600 tracking-widest uppercase mb-1"
              style={{ color: tier.accentColor }}
            >
              {tier.icon} {tier.title}
            </p>
            <p className="text-gray-400 text-xs">{tier.subtitle}</p>
          </div>
          <span
            className={`flex items-center gap-1.5 text-xs font-600 px-2.5 py-1 rounded-full border flex-shrink-0 ${realism.bg} ${realism.border} ${realism.text}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${realism.dot}`} />
            {tier.realismLabel}
          </span>
        </div>
      </div>

      {/* Hero metrics — R:R and Win Rate */}
      <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-slate-700/50">
        <div>
          <p className="text-label mb-1">Risk : Reward</p>
          <p className="text-2xl font-700 text-white text-metric">1:{tier.rrRatio}</p>
        </div>
        <div>
          <p className="text-label mb-1">Win Rate Needed</p>
          <p className={`text-2xl font-700 text-metric ${winRateColor}`}>
            {(tier.winRate * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Detail rows */}
      <div className="space-y-3.5">
        <div className="flex justify-between items-center">
          <span className="text-label">Trades Needed</span>
          <span className="text-white font-600 text-sm text-metric">{tier.tradesNeeded}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-label">Trade Frequency</span>
          <span className="text-white font-600 text-sm text-metric">{tradeFrequency}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-label">Risk / Trade</span>
          <span className="text-loss font-600 text-sm text-metric">
            –${tier.riskPerTrade.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-label">Reward / Trade</span>
          <span className="text-profit font-600 text-sm text-metric">
            +${tier.rewardPerTrade.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-label">Avg EV / Trade</span>
          <span className="font-600 text-sm text-metric" style={{ color: tier.accentColor }}>
            +${tier.evPerTrade.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-slate-700/50">
          <span className="text-label">Suggested Leverage</span>
          <span className="font-700 text-sm text-metric" style={{ color: tier.accentColor }}>
            {tier.suggestedLeverage}
          </span>
        </div>
      </div>
    </div>
  );
}
