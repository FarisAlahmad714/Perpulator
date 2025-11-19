'use client';

import { useState, useMemo } from 'react';
import { Position, PositionAdjustment as PositionAdjustmentType } from '@/types/position';
import {
  calculateAdjustedPosition,
  calculateRiskAmount,
  calculateRewardAmount,
  calculateRiskRewardRatio,
  calculateLiquidationPrice
} from '@/utils/calculations';
import { usePrice } from '@/contexts/PriceContext';
import { RotateCcw } from 'lucide-react';

interface PositionAdjustmentProps {
  position: Position;
}

export default function PositionAdjustment({ position }: PositionAdjustmentProps) {
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [newEntryPrice, setNewEntryPrice] = useState('');
  const [adjustmentSizeUSD, setAdjustmentSizeUSD] = useState('');
  const [takeProfitPrice, setTakeProfitPrice] = useState(position.takeProfit ? String(position.takeProfit) : '');
  const [partialTPPercent, setPartialTPPercent] = useState(100);

  const livePrice = usePrice(position.symbol);

  // Calculate adjusted position
  const adjustment: PositionAdjustmentType | null =
    adjustmentSizeUSD && newEntryPrice
      ? {
          type: adjustmentType,
          newEntryPrice: parseFloat(newEntryPrice),
          adjustmentSize: parseFloat(adjustmentSizeUSD),
        }
      : null;

  const calculated = adjustment ? calculateAdjustedPosition(position, adjustment) : null;

  // Original metrics
  const originalMetrics = useMemo(() => {
    const riskAmount = calculateRiskAmount(
      position.entryPrice,
      position.stopLoss,
      position.positionSize,
      position.leverage,
      position.sideEntry
    );

    let rewardAmount = 0;
    if (takeProfitPrice) {
      rewardAmount = calculateRewardAmount(
        position.entryPrice,
        parseFloat(takeProfitPrice),
        position.positionSize,
        position.leverage,
        position.sideEntry
      );
    } else if (position.stopLoss) {
      rewardAmount = riskAmount * 2;
    }

    const riskRewardRatio = calculateRiskRewardRatio(riskAmount, rewardAmount);
    const liquidationPrice = calculateLiquidationPrice(
      position.entryPrice,
      position.leverage,
      position.sideEntry
    );

    return {
      riskAmount,
      rewardAmount,
      riskRewardRatio,
      liquidationPrice: liquidationPrice > 0 ? liquidationPrice : undefined,
    };
  }, [position.entryPrice, position.stopLoss, position.positionSize, position.leverage, position.sideEntry, takeProfitPrice]);

  const formatNumber = (value: number, decimals = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  return (
    <div className="w-full py-8 sm:py-12">
      {/* Original Position Metrics */}
      <div className="mb-20 sm:mb-24">
        <h3 className="text-label mb-12 sm:mb-16">Your Position</h3>

        {/* Main Metrics Grid */}
        <div className="space-y-8 sm:space-y-12">
          {/* Risk/Reward Hero */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 sm:gap-16">
            <div>
              <p className="text-label mb-4">Risk Amount</p>
              <p className={`text-4xl sm:text-5xl font-700 text-loss text-metric`}>
                ${formatNumber(Math.abs(originalMetrics.riskAmount))}
              </p>
            </div>
            <div>
              <p className="text-label mb-4">Reward Potential</p>
              <p className={`text-4xl sm:text-5xl font-700 text-profit text-metric`}>
                ${formatNumber(originalMetrics.rewardAmount)}
              </p>
            </div>
          </div>

          {/* Risk/Reward Ratio */}
          <div className="metric-card">
            <p className="text-label mb-4">Risk/Reward Ratio</p>
            <p className={`text-5xl sm:text-6xl font-700 text-neutral`}>
              1:{formatNumber(originalMetrics.riskRewardRatio, 2)}
            </p>
            <p className="text-xs text-gray-400 mt-4">
              {originalMetrics.riskRewardRatio >= 2 ? '✓ Favorable ratio' : '⚠ Consider improving'}
            </p>
          </div>

          {/* Position Details */}
          <div className="card-bg">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-12">
              <div>
                <p className="text-label mb-3">Entry Price</p>
                <p className="text-2xl sm:text-3xl font-600 text-metric">
                  ${formatNumber(position.entryPrice)}
                </p>
              </div>
              <div>
                <p className="text-label mb-3">Position Size</p>
                <p className="text-2xl sm:text-3xl font-600 text-metric">
                  ${formatNumber(position.positionSize)}
                </p>
              </div>
              <div>
                <p className="text-label mb-3">Leverage</p>
                <p className="text-2xl sm:text-3xl font-600 text-metric">
                  {formatNumber(position.leverage, 1)}x
                </p>
              </div>
              {position.stopLoss && (
                <div>
                  <p className="text-label mb-3">Stop Loss</p>
                  <p className="text-2xl sm:text-3xl font-600 text-metric">
                    ${formatNumber(position.stopLoss)}
                  </p>
                </div>
              )}
              {originalMetrics.liquidationPrice && (
                <div>
                  <p className="text-label mb-3">Liquidation</p>
                  <p className="text-2xl sm:text-3xl font-600 text-metric">
                    ${formatNumber(originalMetrics.liquidationPrice)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-label mb-3">Direction</p>
                <p className={`text-2xl sm:text-3xl font-600 ${position.sideEntry === 'long' ? 'text-profit' : 'text-loss'}`}>
                  {position.sideEntry.toUpperCase()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Adjustment Section */}
      <div className="mb-20 sm:mb-24 pb-12 sm:pb-16 border-t border-slate-700/50">
        <h3 className="text-label mb-12 sm:mb-16 pt-12 sm:pt-16">Adjust Position</h3>

        <div className="space-y-8 sm:space-y-12">
          {/* Action Toggle */}
          <div className="flex gap-4">
            <button
              onClick={() => setAdjustmentType('add')}
              className={`flex-1 py-4 px-6 rounded-lg font-600 transition-all ${
                adjustmentType === 'add'
                  ? 'bg-profit/20 border border-profit text-profit'
                  : 'bg-gray-700/30 border border-gray-600/50 text-gray-400 hover:border-gray-500'
              }`}
            >
              Add Position
            </button>
            <button
              onClick={() => setAdjustmentType('subtract')}
              className={`flex-1 py-4 px-6 rounded-lg font-600 transition-all ${
                adjustmentType === 'subtract'
                  ? 'bg-loss/20 border border-loss text-loss'
                  : 'bg-gray-700/30 border border-gray-600/50 text-gray-400 hover:border-gray-500'
              }`}
            >
              Reduce Position
            </button>
          </div>

          {/* Input Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
            <div>
              <label className="text-label mb-2 block">Entry Price</label>
              <input
                type="number"
                step="0.00000001"
                value={newEntryPrice}
                onChange={(e) => setNewEntryPrice(e.target.value)}
                placeholder={`e.g., ${position.entryPrice}`}
                className="input-field text-2xl sm:text-3xl font-600 text-metric"
              />
              {livePrice?.price && (
                <p className="text-xs text-gray-500 mt-3">Current: ${formatNumber(livePrice.price)}</p>
              )}
            </div>
            <div>
              <label className="text-label mb-2 block">Adjustment Size</label>
              <input
                type="number"
                step="0.00000001"
                value={adjustmentSizeUSD}
                onChange={(e) => setAdjustmentSizeUSD(e.target.value)}
                placeholder="e.g., 1500"
                className="input-field text-2xl sm:text-3xl font-600 text-metric"
              />
            </div>
          </div>

          {/* Take Profit for RR Calculation */}
          <div>
            <label className="text-label mb-2 block">Take Profit Target (Optional)</label>
            <input
              type="number"
              step="0.00000001"
              value={takeProfitPrice}
              onChange={(e) => setTakeProfitPrice(e.target.value)}
              placeholder="Enter take profit target"
              className="input-field text-2xl font-500 text-metric"
            />
          </div>
        </div>
      </div>

      {/* Adjusted Results */}
      {calculated && (
        <div className="mb-20 sm:mb-24 animate-fade-in-up">
          <h3 className="text-label mb-12 sm:mb-16">After Adjustment</h3>

          <div className="space-y-8 sm:space-y-12">
            {/* New Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 sm:gap-16">
              <div>
                <p className="text-label mb-4">New Avg Entry</p>
                <p className="text-4xl sm:text-5xl font-700 text-metric">
                  ${formatNumber(calculated.averageEntryPrice)}
                </p>
              </div>
              <div>
                <p className="text-label mb-4">Total Position</p>
                <p className="text-4xl sm:text-5xl font-700 text-metric">
                  ${formatNumber(calculated.totalSize)}
                </p>
              </div>
            </div>

            {/* Risk/Reward After Adjustment */}
            <div className="metric-card">
              <div className="grid grid-cols-2 gap-8 sm:gap-12">
                <div>
                  <p className="text-label mb-3">New Risk</p>
                  <p className="text-3xl sm:text-4xl font-700 text-loss text-metric">
                    ${formatNumber(Math.abs(calculated.riskAmount))}
                  </p>
                </div>
                <div>
                  <p className="text-label mb-3">New Reward</p>
                  <p className="text-3xl sm:text-4xl font-700 text-profit text-metric">
                    ${formatNumber(calculated.rewardAmount)}
                  </p>
                </div>
              </div>
            </div>

            {/* New RR Ratio */}
            <div className="metric-card border-2 border-neutral/50">
              <p className="text-label mb-4">New Risk/Reward</p>
              <p className="text-5xl sm:text-6xl font-700 text-neutral">
                1:{formatNumber(calculated.riskRewardRatio, 2)}
              </p>
            </div>

            {/* Liquidation Price */}
            {calculated.liquidationPrice && (
              <div className="card-bg">
                <p className="text-label mb-4">Liquidation Price</p>
                <p className="text-3xl sm:text-4xl font-600 text-metric">
                  ${formatNumber(calculated.liquidationPrice)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
