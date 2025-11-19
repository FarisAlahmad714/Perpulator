'use client';

import { useState, useMemo } from 'react';
import { Position, PositionAdjustment as PositionAdjustmentType } from '@/types/position';
import {
  calculateAdjustedPosition,
  calculateRiskAmount,
  calculateRewardAmount,
  calculateRiskRewardRatio,
  calculateLiquidationPrice,
  calculatePNL
} from '@/utils/calculations';
import { usePrice } from '@/contexts/PriceContext';
import { RotateCcw, Info } from 'lucide-react';

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
          takeProfit: takeProfitPrice ? parseFloat(takeProfitPrice) : undefined,
        }
      : null;

  const calculated = adjustment ? calculateAdjustedPosition(position, adjustment, livePrice?.price) : null;

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

    // Calculate PNL if current price is available
    let pnlPercentage = undefined;
    let pnlUSD = undefined;
    if (livePrice?.price) {
      const pnlCalc = calculatePNL(
        position.entryPrice,
        livePrice.price,
        position.positionSize,
        position.leverage,
        position.sideEntry
      );
      pnlPercentage = pnlCalc.pnlPercentage;
      pnlUSD = pnlCalc.pnl;
    }

    return {
      riskAmount,
      rewardAmount,
      riskRewardRatio,
      liquidationPrice: liquidationPrice > 0 ? liquidationPrice : undefined,
      pnlPercentage,
      pnlUSD,
    };
  }, [position.entryPrice, position.stopLoss, position.positionSize, position.leverage, position.sideEntry, takeProfitPrice, livePrice?.price]);

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
              <div className="flex items-center gap-2 mb-4">
                <p className="text-label">Risk Amount</p>
                <Info
                  size={16}
                  className="text-neutral/50 hover:text-neutral transition-colors cursor-help"
                  title="Maximum amount you can lose if stop loss is hit"
                />
              </div>
              <p className={`text-4xl sm:text-5xl font-700 text-loss text-metric`}>
                ${formatNumber(Math.abs(originalMetrics.riskAmount))}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-4">
                <p className="text-label">Reward Potential</p>
                <Info
                  size={16}
                  className="text-neutral/50 hover:text-neutral transition-colors cursor-help"
                  title="Maximum profit if take profit target is reached"
                />
              </div>
              <p className={`text-4xl sm:text-5xl font-700 text-profit text-metric`}>
                ${formatNumber(originalMetrics.rewardAmount)}
              </p>
            </div>
          </div>

          {/* Risk/Reward Ratio */}
          <div className="metric-card">
            <div className="flex items-center gap-2 mb-4">
              <p className="text-label">Risk/Reward Ratio</p>
              <Info
                size={16}
                className="text-neutral/50 hover:text-neutral transition-colors cursor-help"
                title="For every $1 you risk, you can make $X. Higher is better (2:1 is favorable)"
              />
            </div>
            <p className={`text-5xl sm:text-6xl font-700 text-neutral`}>
              1:{formatNumber(originalMetrics.riskRewardRatio, 2)}
            </p>
            <p className="text-xs text-gray-400 mt-4">
              {originalMetrics.riskRewardRatio >= 2 ? '✓ Favorable ratio' : '⚠ Consider improving'}
            </p>
          </div>

          {/* Current PNL % */}
          {originalMetrics.pnlPercentage !== undefined && (
            <div className="metric-card">
              <div className="flex items-center gap-2 mb-4">
                <p className="text-label">Current PNL</p>
                <Info
                  size={16}
                  className="text-neutral/50 hover:text-neutral transition-colors cursor-help"
                  title="Your current unrealized profit/loss. % includes leverage effect on your margin"
                />
              </div>
              <p className={`text-5xl sm:text-6xl font-700 ${
                originalMetrics.pnlPercentage >= 0 ? 'text-profit' : 'text-loss'
              }`}>
                {originalMetrics.pnlPercentage >= 0 ? '+' : ''}{formatNumber(originalMetrics.pnlPercentage, 2)}%
              </p>
              {originalMetrics.pnlUSD !== undefined && (
                <p className="text-sm text-gray-400 mt-3">
                  {originalMetrics.pnlUSD >= 0 ? '+' : ''}${formatNumber(Math.abs(originalMetrics.pnlUSD))}
                </p>
              )}
            </div>
          )}

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
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-label">New Risk</p>
                    <Info
                      size={14}
                      className="text-neutral/50 hover:text-neutral transition-colors cursor-help"
                      title="Updated max loss with new average entry price"
                    />
                  </div>
                  <p className="text-3xl sm:text-4xl font-700 text-loss text-metric">
                    ${formatNumber(Math.abs(calculated.riskAmount))}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-label">New Reward</p>
                    <Info
                      size={14}
                      className="text-neutral/50 hover:text-neutral transition-colors cursor-help"
                      title="Updated max profit if take profit is reached"
                    />
                  </div>
                  <p className="text-3xl sm:text-4xl font-700 text-profit text-metric">
                    ${formatNumber(calculated.rewardAmount)}
                  </p>
                </div>
              </div>
            </div>

            {/* New RR Ratio */}
            <div className="metric-card border-2 border-neutral/50">
              <div className="flex items-center gap-2 mb-4">
                <p className="text-label">New Risk/Reward</p>
                <Info
                  size={16}
                  className="text-neutral/50 hover:text-neutral transition-colors cursor-help"
                  title="Updated ratio after position adjustment. Shows how your setup changes"
                />
              </div>
              <p className="text-5xl sm:text-6xl font-700 text-neutral">
                1:{formatNumber(calculated.riskRewardRatio, 2)}
              </p>
            </div>

            {/* New PNL % and Total PNL USD */}
            {calculated.pnlPercentage !== undefined && (
              <div className="metric-card">
                <div className="grid grid-cols-2 gap-8 sm:gap-12">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-label">Updated PNL %</p>
                      <Info
                        size={14}
                        className="text-neutral/50 hover:text-neutral transition-colors cursor-help"
                        title="Current return % on your total margin including leverage. Decreases when average entry gets closer to current price"
                      />
                    </div>
                    <p className={`text-3xl sm:text-4xl font-700 ${
                      calculated.pnlPercentage >= 0 ? 'text-profit' : 'text-loss'
                    }`}>
                      {calculated.pnlPercentage >= 0 ? '+' : ''}{formatNumber(calculated.pnlPercentage, 2)}%
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-label">Total PNL USD</p>
                      <Info
                        size={14}
                        className="text-neutral/50 hover:text-neutral transition-colors cursor-help"
                        title="Your current unrealized profit/loss in dollars. Increases when you add profitable margin"
                      />
                    </div>
                    <p className={`text-3xl sm:text-4xl font-700 ${
                      calculated.pnl !== undefined && calculated.pnl >= 0 ? 'text-profit' : 'text-loss'
                    }`}>
                      {calculated.pnl !== undefined ? (calculated.pnl >= 0 ? '+' : '') + formatNumber(calculated.pnl) : '$0.00'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Liquidation Price */}
            {calculated.liquidationPrice && (
              <div className="card-bg">
                <div className="flex items-center gap-2 mb-4">
                  <p className="text-label">Liquidation Price</p>
                  <Info
                    size={16}
                    className="text-neutral/50 hover:text-neutral transition-colors cursor-help"
                    title="Price at which your position will be forcefully closed and margin liquidated"
                  />
                </div>
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
