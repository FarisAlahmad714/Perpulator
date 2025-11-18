'use client';

import { useState, useEffect, useMemo } from 'react';
import { Position, PositionAdjustment as PositionAdjustmentType } from '@/types/position';
import {
  calculateAdjustedPosition,
  calculateRiskAmount,
  calculateRewardAmount,
  calculateRiskRewardRatio,
  calculateLiquidationPrice
} from '@/utils/calculations';
import { usePrice } from '@/contexts/PriceContext';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface PositionAdjustmentProps {
  position: Position;
}

export default function PositionAdjustment({ position }: PositionAdjustmentProps) {
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [newEntryPrice, setNewEntryPrice] = useState('');
  const [adjustmentSizeUSD, setAdjustmentSizeUSD] = useState('');
  const [adjustmentSizeCoins, setAdjustmentSizeCoins] = useState('');
  const [useCoinsInput, setUseCoinsInput] = useState(false);
  const [takeProfitPrice, setTakeProfitPrice] = useState(position.takeProfit ? String(position.takeProfit) : '');
  const [partialTPPercent, setPartialTPPercent] = useState(100);

  // Get live price from context
  const livePrice = usePrice(position.symbol);

  // Convert between USD and coins
  useEffect(() => {
    if (livePrice?.price) {
      if (useCoinsInput && adjustmentSizeCoins) {
        const usdValue = (parseFloat(adjustmentSizeCoins) * livePrice.price).toFixed(2);
        setAdjustmentSizeUSD(usdValue);
      } else if (!useCoinsInput && adjustmentSizeUSD) {
        const coins = (parseFloat(adjustmentSizeUSD) / livePrice.price).toFixed(6);
        setAdjustmentSizeCoins(coins);
      }
    }
  }, [adjustmentSizeUSD, adjustmentSizeCoins, useCoinsInput, livePrice?.price]);

  // Calculate adjusted position
  const adjustment: PositionAdjustmentType | null =
    adjustmentSizeUSD && newEntryPrice
      ? {
          type: adjustmentType,
          newEntryPrice: parseFloat(newEntryPrice),
          adjustmentSize: parseFloat(adjustmentSizeUSD),
        }
      : null;

  const calculated = adjustment
    ? calculateAdjustedPosition(position, adjustment)
    : null;

  // Calculate adjusted position RR with take profit if provided
  const adjustedMetricsWithTP = useMemo(() => {
    if (!calculated || !takeProfitPrice) return null;

    const riskAmount = calculated.riskAmount;
    const rewardAmount = calculateRewardAmount(
      calculated.averageEntryPrice,
      parseFloat(takeProfitPrice),
      calculated.totalSize,
      position.leverage,
      position.sideEntry
    );
    const riskRewardRatio = calculateRiskRewardRatio(riskAmount, rewardAmount);

    return {
      rewardAmount,
      riskRewardRatio,
    };
  }, [calculated, takeProfitPrice, position.leverage, position.sideEntry]);

  // Calculate partial TP exit scenario
  const partialTPMetrics = useMemo(() => {
    if (!takeProfitPrice) return null;

    const tpPrice = parseFloat(takeProfitPrice);
    const notionalSize = position.positionSize * position.leverage;

    // Amount being closed at TP
    const closingPercent = partialTPPercent / 100;
    const closingNotionalSize = notionalSize * closingPercent;
    const closingMarginSize = position.positionSize * closingPercent;

    // Profit from closing at TP
    const priceDifference = Math.abs(tpPrice - position.entryPrice);
    const profitPercent = priceDifference / position.entryPrice;
    const profitFromTP = closingNotionalSize * profitPercent;

    // Remaining position
    const remainingPercent = 1 - closingPercent;
    const remainingNotionalSize = notionalSize * remainingPercent;
    const remainingMarginSize = position.positionSize * remainingPercent;

    // New RR for remaining position
    let remainingRiskAmount = 0;
    let remainingRewardAmount = 0;

    if (position.stopLoss) {
      const slDifference = Math.abs(position.entryPrice - position.stopLoss);
      const slRiskPercent = slDifference / position.entryPrice;
      remainingRiskAmount = remainingNotionalSize * slRiskPercent;

      const tpRewardPercent = profitPercent;
      remainingRewardAmount = remainingNotionalSize * tpRewardPercent;
    }

    const remainingRR = remainingRewardAmount > 0 ? remainingRewardAmount / remainingRiskAmount : 0;

    return {
      closingPercent: partialTPPercent,
      closingMarginSize,
      closingNotionalSize,
      profitFromTP,
      remainingPercent: (1 - closingPercent) * 100,
      remainingMarginSize,
      remainingNotionalSize,
      remainingRiskAmount,
      remainingRewardAmount,
      remainingRR,
      totalProfitIfTPHit: profitFromTP,
    };
  }, [takeProfitPrice, partialTPPercent, position]);

  const formatNumber = (value: number, decimals = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  // Calculate original position metrics
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
      // Calculate reward based on actual take profit price
      rewardAmount = calculateRewardAmount(
        position.entryPrice,
        parseFloat(takeProfitPrice),
        position.positionSize,
        position.leverage,
        position.sideEntry
      );
    } else if (position.stopLoss) {
      // Default to 2:1 ratio if no TP specified
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

  return (
    <div className="space-y-6">
      {/* Original Position Summary */}
      <div className="card-bg p-6">
        <h3 className="text-lg font-bold mb-4">Original Position</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-400">Entry Price</p>
            <p className="text-xl font-bold">${formatNumber(position.entryPrice)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Position Size</p>
            <p className="text-xl font-bold">${formatNumber(position.positionSize)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Leverage</p>
            <p className="text-xl font-bold">{formatNumber(position.leverage, 1)}x</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Direction</p>
            <p
              className={`text-xl font-bold ${
                position.sideEntry === 'long' ? 'text-profit' : 'text-loss'
              }`}
            >
              {position.sideEntry.toUpperCase()}
            </p>
          </div>
          {position.stopLoss && (
            <div>
              <p className="text-sm text-gray-400">Stop Loss</p>
              <p className="text-xl font-bold">${formatNumber(position.stopLoss)}</p>
            </div>
          )}
          {originalMetrics.liquidationPrice !== undefined && (
            <div>
              <p className="text-sm text-gray-400">Liquidation Price</p>
              <p className="text-xl font-bold text-yellow-400">${formatNumber(originalMetrics.liquidationPrice)}</p>
            </div>
          )}
          {takeProfitPrice && (
            <div>
              <p className="text-sm text-gray-400">Take Profit Target</p>
              <p className="text-xl font-bold text-blue-400">${formatNumber(parseFloat(takeProfitPrice))}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-400">Risk Amount</p>
            <p className="text-xl font-bold text-loss">${formatNumber(Math.abs(originalMetrics.riskAmount))}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Reward Amount</p>
            <p className="text-xl font-bold text-profit">${formatNumber(originalMetrics.rewardAmount)}</p>
          </div>
          <div className="col-span-2 bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg">
            <p className="text-sm text-gray-400 mb-2">Risk/Reward Ratio</p>
            <p className={`text-2xl font-bold ${originalMetrics.riskRewardRatio >= 2 ? 'text-profit' : 'text-yellow-400'}`}>
              1:{formatNumber(originalMetrics.riskRewardRatio, 2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {originalMetrics.riskRewardRatio >= 2 ? '✓ Good ratio' : '⚠ Consider improving'}
            </p>
          </div>
        </div>
      </div>

      {/* Exit Strategy: Partial TP */}
      <div className="card-bg p-6">
        <h3 className="text-lg font-bold mb-4">Exit Strategy</h3>

        {/* Take Profit Price */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Take Profit Target (USD)</label>
          <input
            type="number"
            step="0.00000001"
            value={takeProfitPrice}
            onChange={(e) => setTakeProfitPrice(e.target.value)}
            placeholder="Enter your take profit target"
            className="input-field w-full"
          />
          <p className="text-xs text-gray-500 mt-1">Leave empty to use 2:1 default ratio</p>
        </div>

        {/* Partial TP Execution */}
        {takeProfitPrice && (
          <div className="bg-purple-900/20 border border-purple-500/30 p-4 rounded-lg">
            <label className="block text-sm font-semibold mb-3">Partial Exit Planning</label>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Close {partialTPPercent}% at TP</span>
                <span className="text-sm font-semibold text-purple-400">${formatNumber(position.takeProfit || parseFloat(takeProfitPrice))}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={partialTPPercent}
                onChange={(e) => setPartialTPPercent(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {partialTPMetrics && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-green-900/20 p-3 rounded border border-green-500/30">
                  <p className="text-gray-400 text-xs">Profit from {partialTPPercent}%</p>
                  <p className="text-lg font-bold text-profit">${formatNumber(partialTPMetrics.profitFromTP)}</p>
                </div>
                <div className="bg-blue-900/20 p-3 rounded border border-blue-500/30">
                  <p className="text-gray-400 text-xs">Remaining Position</p>
                  <p className="text-lg font-bold text-blue-400">${formatNumber(partialTPMetrics.remainingMarginSize)}</p>
                </div>
                {partialTPPercent < 100 && (
                  <>
                    <div className="bg-orange-900/20 p-3 rounded border border-orange-500/30">
                      <p className="text-gray-400 text-xs">Remaining Risk</p>
                      <p className="text-lg font-bold text-orange-400">${formatNumber(partialTPMetrics.remainingRiskAmount)}</p>
                    </div>
                    <div className="bg-purple-900/20 p-3 rounded border border-purple-500/30">
                      <p className="text-gray-400 text-xs">Remaining RR</p>
                      <p className={`text-lg font-bold ${partialTPMetrics.remainingRR >= 2 ? 'text-profit' : 'text-yellow-400'}`}>
                        1:{formatNumber(partialTPMetrics.remainingRR, 2)}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Adjustment Form */}
      <div className="card-bg p-6">
        <h3 className="text-lg font-bold mb-4">Adjust Position</h3>

        {/* Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2">Action</label>
          <div className="flex gap-4">
            <button
              onClick={() => setAdjustmentType('add')}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                adjustmentType === 'add'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Add to Position
            </button>
            <button
              onClick={() => setAdjustmentType('subtract')}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                adjustmentType === 'subtract'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Reduce Position
            </button>
          </div>
        </div>

        {/* New Entry Price */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">New Entry Price (USD)</label>
          <input
            type="number"
            step="0.00000001"
            value={newEntryPrice}
            onChange={(e) => setNewEntryPrice(e.target.value)}
            placeholder={`e.g., ${position.entryPrice}`}
            className="input-field w-full"
          />
          {livePrice?.price && (
            <p className="text-xs text-gray-500 mt-1">Current: ${formatNumber(livePrice.price)}</p>
          )}
        </div>

        {/* Adjustment Size */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold">Adjustment Size</label>
            <button
              type="button"
              onClick={() => setUseCoinsInput(!useCoinsInput)}
              className="text-xs text-gray-400 hover:text-gray-300 underline"
            >
              Switch to {useCoinsInput ? 'USD' : 'Coins'}
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.00000001"
              value={useCoinsInput ? adjustmentSizeCoins : adjustmentSizeUSD}
              onChange={(e) =>
                useCoinsInput
                  ? setAdjustmentSizeCoins(e.target.value)
                  : setAdjustmentSizeUSD(e.target.value)
              }
              placeholder={useCoinsInput ? 'e.g., 0.2' : 'e.g., 2000'}
              className="input-field flex-1"
            />
            <div className="bg-gray-700 px-4 py-2 rounded-lg flex items-center text-sm font-semibold text-gray-300">
              {useCoinsInput ? position.symbol : 'USD'}
            </div>
          </div>
          {livePrice?.price && (
            <p className="text-xs text-gray-500 mt-1">
              = {useCoinsInput ? (parseFloat(adjustmentSizeCoins || '0') * livePrice.price).toFixed(2) : (parseFloat(adjustmentSizeUSD || '0') / livePrice.price).toFixed(6)}{' '}
              {useCoinsInput ? 'USD' : position.symbol}
            </p>
          )}
        </div>
      </div>

      {/* Calculated Results */}
      {calculated && (
        <div className="card-bg p-6">
          <h3 className="text-lg font-bold mb-4">New Position Metrics</h3>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Average Entry Price */}
            <div className="bg-gray-700/30 p-4 rounded-lg">
              <p className="text-sm text-gray-400 mb-1">Avg Entry Price</p>
              <p className="text-xl font-bold">${formatNumber(calculated.averageEntryPrice)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {calculated.averageEntryPrice > position.entryPrice ? '+' : ''}
                {formatNumber(calculated.averageEntryPrice - position.entryPrice, 8)}
              </p>
            </div>

            {/* Total Size */}
            <div className="bg-gray-700/30 p-4 rounded-lg">
              <p className="text-sm text-gray-400 mb-1">Total Position</p>
              <p className="text-xl font-bold">${formatNumber(calculated.totalSize)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {adjustmentType === 'add' ? '+' : '-'}${formatNumber(parseFloat(adjustmentSizeUSD || '0'))}
              </p>
            </div>

            {/* Risk Amount */}
            <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-lg">
              <p className="text-sm text-gray-400 mb-1">Risk Amount</p>
              <p className="text-xl font-bold text-loss">
                ${formatNumber(Math.abs(calculated.riskAmount))}
              </p>
              {position.stopLoss && (
                <p className="text-xs text-gray-500 mt-1">
                  SL: ${formatNumber(position.stopLoss)}
                </p>
              )}
            </div>

            {/* Reward Amount */}
            <div className="bg-green-900/20 border border-green-500/30 p-4 rounded-lg">
              <p className="text-sm text-gray-400 mb-1">Reward Potential</p>
              <p className="text-xl font-bold text-profit">
                ${formatNumber(adjustedMetricsWithTP?.rewardAmount || calculated.rewardAmount)}
              </p>
              {(adjustedMetricsWithTP?.riskRewardRatio || calculated.riskRewardRatio) > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Ratio: 1:{formatNumber(adjustedMetricsWithTP?.riskRewardRatio || calculated.riskRewardRatio, 2)}
                </p>
              )}
            </div>

            {/* Risk/Reward Ratio */}
            <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg">
              <p className="text-sm text-gray-400 mb-1">Risk/Reward Ratio</p>
              <p className="text-xl font-bold text-neutral">
                1:{formatNumber(adjustedMetricsWithTP?.riskRewardRatio || calculated.riskRewardRatio, 2)}
              </p>
              {(adjustedMetricsWithTP?.riskRewardRatio || calculated.riskRewardRatio) >= 2 ? (
                <p className="text-xs text-green-400 mt-1">✓ Good ratio</p>
              ) : (
                <p className="text-xs text-yellow-400 mt-1">⚠ Consider improving</p>
              )}
            </div>

            {/* Take Profit Target */}
            {takeProfitPrice && (
              <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">Take Profit Target</p>
                <p className="text-xl font-bold text-blue-400">
                  ${formatNumber(parseFloat(takeProfitPrice))}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {position.sideEntry === 'long' ? '↑' : '↓'}{' '}
                  {formatNumber(
                    Math.abs(parseFloat(takeProfitPrice) - calculated.averageEntryPrice),
                    2
                  )}
                </p>
              </div>
            )}

            {/* Liquidation Price */}
            {calculated.liquidationPrice !== undefined && (
              <div className="bg-yellow-900/20 border border-yellow-500/30 p-4 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">Liquidation Price</p>
                <p className="text-xl font-bold text-yellow-400">
                  ${formatNumber(calculated.liquidationPrice)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {position.sideEntry === 'long' ? '↓' : '↑'}{' '}
                  {formatNumber(
                    Math.abs(calculated.liquidationPrice - calculated.averageEntryPrice),
                    2
                  )}
                </p>
              </div>
            )}

            {/* PNL if Current Price Available */}
            {calculated.pnl !== undefined && (
              <div
                className={`p-4 rounded-lg ${
                  calculated.pnl >= 0
                    ? 'bg-green-900/20 border border-green-500/30'
                    : 'bg-red-900/20 border border-red-500/30'
                }`}
              >
                <p className="text-sm text-gray-400 mb-1">Current PnL</p>
                <p
                  className={`text-xl font-bold ${
                    calculated.pnl >= 0 ? 'text-profit' : 'text-loss'
                  }`}
                >
                  ${formatNumber(calculated.pnl)}
                </p>
                <p
                  className={`text-xs mt-1 ${
                    calculated.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {calculated.pnlPercentage ? calculated.pnlPercentage.toFixed(2) : '0.00'}%
                </p>
              </div>
            )}
          </div>

          {/* Warning if reducing too much */}
          {adjustmentType === 'subtract' &&
            parseFloat(adjustmentSizeUSD || '0') > position.positionSize && (
              <div className="flex items-start gap-3 bg-red-900/20 border border-red-500 rounded-lg p-4">
                <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-400">Adjustment exceeds position size</p>
                  <p className="text-sm text-red-300">
                    You're trying to reduce more than your current position
                  </p>
                </div>
              </div>
            )}
        </div>
      )}

      {/* Empty State */}
      {!calculated && (
        <div className="card-bg p-8 text-center">
          <AlertCircle className="mx-auto mb-3 text-gray-500" size={32} />
          <p className="text-gray-400">
            Enter an adjustment price and size to see your new position metrics
          </p>
        </div>
      )}
    </div>
  );
}
