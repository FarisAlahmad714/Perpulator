'use client';

import { useState, useMemo } from 'react';
import { Position, PositionEntry, PositionAdjustment as PositionAdjustmentType } from '@/types/position';
import {
  calculateRiskAmount,
  calculateRewardAmount,
  calculateRiskRewardRatio,
  calculateLiquidationPrice,
  calculatePNL
} from '@/utils/calculations';
import { usePrice } from '@/contexts/PriceContext';
import { trackPositionAdjusted } from '@/lib/analytics';
import { Plus, Minus, Info, Trash2, Edit2, Check, X, RotateCcw, ChevronDown } from 'lucide-react';

interface PositionAdjustmentProps {
  position: Position;
  onPositionUpdate: (updatedPosition: Position) => void;
  onReset?: () => void;
}

interface EditingEntry {
  index: number;
  entryPrice: string;
  size: string;
  leverage: string;
  takeProfit: string;
  stopLoss: string;
}

export default function PositionAdjustment({ position, onPositionUpdate, onReset }: PositionAdjustmentProps) {
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [newEntryPrice, setNewEntryPrice] = useState('');
  const [adjustmentSizeUSD, setAdjustmentSizeUSD] = useState('');
  const [adjustmentSizePercent, setAdjustmentSizePercent] = useState('');
  const [sizeInputMode, setSizeInputMode] = useState<'usd' | 'percent'>('usd');
  const [adjustmentLeverage, setAdjustmentLeverage] = useState('1');
  const [stopLossPrice, setStopLossPrice] = useState(position.stopLoss ? String(position.stopLoss) : '');
  const [takeProfitPrice, setTakeProfitPrice] = useState(position.takeProfit ? String(position.takeProfit) : '');
  const [editingEntry, setEditingEntry] = useState<EditingEntry | null>(null);

  const livePrice = usePrice(position.symbol);

  // Calculate total position from all entries
  // IMPORTANT: Only open entries (initial + add) count toward current position
  // Closed entries (subtract) are removed from those open amounts
  const totals = useMemo(() => {
    let openSize = 0;
    let openLeveragedCapital = 0;
    let openWeightedEntryPrice = 0;
    let closedSize = 0;

    // Separate open and closed entries
    for (const entry of position.entries) {
      if (entry.type === 'subtract') {
        closedSize += entry.size;
      } else {
        openSize += entry.size;
        openLeveragedCapital += entry.size * entry.leverage;
        openWeightedEntryPrice += entry.size * entry.entryPrice;
      }
    }

    // Calculate remaining open position (FIFO: closed positions come from oldest entries first)
    const remainingSize = Math.max(openSize - closedSize, 0);

    // For weighted average, we need to account for which entries contributed to remaining position
    // Using FIFO: closed positions are taken from the oldest (first) open entries
    let closedRemaining = closedSize;
    let remainingWeightedEntryPrice = 0;
    let remainingLeveragedCapital = 0;

    // Go through entries forward (oldest to newest) to apply FIFO close logic
    for (const entry of position.entries) {
      if (entry.type !== 'subtract') {
        if (closedRemaining <= 0) {
          // This entry is fully remaining
          remainingWeightedEntryPrice += entry.size * entry.entryPrice;
          remainingLeveragedCapital += entry.size * entry.leverage;
        } else if (closedRemaining < entry.size) {
          // Part of this entry is remaining
          const remainingFromThisEntry = entry.size - closedRemaining;
          remainingWeightedEntryPrice += remainingFromThisEntry * entry.entryPrice;
          remainingLeveragedCapital += remainingFromThisEntry * entry.leverage;
          closedRemaining = 0;
        } else {
          // This entire entry is closed
          closedRemaining -= entry.size;
        }
      }
    }

    const averageEntryPrice = remainingSize !== 0 ? remainingWeightedEntryPrice / remainingSize : 0;
    const averageLeverage = remainingSize !== 0 ? remainingLeveragedCapital / remainingSize : 1;

    // Calculate total realized PNL from all reduce entries
    let totalRealizedPNL = 0;
    let totalRealizedPNLPercent = 0;
    let reduceCount = 0;
    for (let i = 0; i < position.entries.length; i++) {
      const entry = position.entries[i];
      if (entry.type === 'subtract') {
        reduceCount++;
        let prevTotalSize = 0;
        let prevWeightedEntryPrice = 0;
        for (let j = 0; j < i; j++) {
          prevTotalSize += position.entries[j].type === 'subtract' ? -position.entries[j].size : position.entries[j].size;
          prevWeightedEntryPrice += (position.entries[j].type === 'subtract' ? -position.entries[j].size : position.entries[j].size) * position.entries[j].entryPrice;
        }
        const prevAvgEntry = prevTotalSize !== 0 ? prevWeightedEntryPrice / prevTotalSize : entry.entryPrice;
        const priceDiff = entry.entryPrice - prevAvgEntry;
        totalRealizedPNL += entry.size * (priceDiff / prevAvgEntry) * (position.sideEntry === 'long' ? 1 : -1) * entry.leverage;
      }
    }

    return {
      totalSize: remainingSize,
      totalCapital: remainingSize,
      totalLeveragedCapital: remainingLeveragedCapital,
      averageEntryPrice: Math.abs(averageEntryPrice),
      averageLeverage: Math.abs(averageLeverage),
      totalRealizedPNL,
      reduceCount,
    };
  }, [position.entries, position.sideEntry]);

  // Calculate actual adjustment size in USD based on input mode
  const actualAdjustmentSizeUSD = sizeInputMode === 'percent' && adjustmentSizePercent
    ? (parseFloat(adjustmentSizePercent) / 100) * totals.totalSize
    : parseFloat(adjustmentSizeUSD) || 0;

  // Calculate proposed adjustment
  // For REDUCE: don't require leverage input, use current position's average leverage
  // For ADD: require leverage input
  const leverageForProposal = adjustmentType === 'subtract' ? totals.averageLeverage : (adjustmentLeverage ? parseFloat(adjustmentLeverage) : null);

  const proposedAdjustment: PositionAdjustmentType | null =
    actualAdjustmentSizeUSD && newEntryPrice && leverageForProposal
      ? {
          type: adjustmentType,
          newEntryPrice: parseFloat(newEntryPrice),
          adjustmentSize: actualAdjustmentSizeUSD,
          adjustmentLeverage: leverageForProposal,
          takeProfit: takeProfitPrice ? parseFloat(takeProfitPrice) : undefined,
        }
      : null;

  // Calculate what position would look like after adjustment
  const projectedPosition = proposedAdjustment
    ? {
        ...position,
        entries: [
          ...position.entries,
          {
            entryPrice: proposedAdjustment.newEntryPrice,
            size: proposedAdjustment.adjustmentSize,
            leverage: proposedAdjustment.adjustmentLeverage,
            timestamp: new Date(),
            type: proposedAdjustment.type,
          },
        ],
      }
    : position;

  const projected = useMemo(() => {
    let openSize = 0;
    let openLeveragedCapital = 0;
    let openWeightedEntryPrice = 0;
    let closedSize = 0;

    // Separate open and closed entries
    for (const entry of projectedPosition.entries) {
      if (entry.type === 'subtract') {
        closedSize += entry.size;
      } else {
        openSize += entry.size;
        openLeveragedCapital += entry.size * entry.leverage;
        openWeightedEntryPrice += entry.size * entry.entryPrice;
      }
    }

    // Calculate remaining open position (FIFO: closed positions come from oldest entries first)
    const totalSize = Math.max(openSize - closedSize, 0);

    // For weighted average, we need to account for which entries contributed to remaining position
    // Using FIFO: closed positions are taken from the oldest (first) open entries
    let closedRemaining = closedSize;
    let remainingWeightedEntryPrice = 0;
    let remainingLeveragedCapital = 0;

    // Go through entries forward (oldest to newest) to apply FIFO close logic
    for (const entry of projectedPosition.entries) {
      if (entry.type !== 'subtract') {
        if (closedRemaining <= 0) {
          // This entry is fully remaining
          remainingWeightedEntryPrice += entry.size * entry.entryPrice;
          remainingLeveragedCapital += entry.size * entry.leverage;
        } else if (closedRemaining < entry.size) {
          // Part of this entry is remaining
          const remainingFromThisEntry = entry.size - closedRemaining;
          remainingWeightedEntryPrice += remainingFromThisEntry * entry.entryPrice;
          remainingLeveragedCapital += remainingFromThisEntry * entry.leverage;
          closedRemaining = 0;
        } else {
          // This entire entry is closed
          closedRemaining -= entry.size;
        }
      }
    }

    const averageEntryPrice = totalSize !== 0 ? remainingWeightedEntryPrice / totalSize : 0;
    const avgLeverage = totalSize !== 0 ? Math.abs(remainingLeveragedCapital / totalSize) : 1;

    const riskAmount = calculateRiskAmount(
      Math.abs(averageEntryPrice),
      position.stopLoss,
      Math.abs(totalSize),
      avgLeverage,
      position.sideEntry
    );

    let rewardAmount = 0;
    if (takeProfitPrice) {
      rewardAmount = calculateRewardAmount(
        Math.abs(averageEntryPrice),
        parseFloat(takeProfitPrice),
        Math.abs(totalSize),
        avgLeverage,
        position.sideEntry
      );
    } else if (position.stopLoss) {
      rewardAmount = riskAmount * 2;
    }

    const riskRewardRatio = calculateRiskRewardRatio(riskAmount, rewardAmount);
    const liquidationPrice = calculateLiquidationPrice(
      Math.abs(averageEntryPrice),
      avgLeverage,
      position.sideEntry
    );

    let pnlPercentage = undefined;
    let pnlUSD = undefined;
    if (livePrice?.price) {
      const pnlCalc = calculatePNL(
        Math.abs(averageEntryPrice),
        livePrice.price,
        Math.abs(totalSize),
        avgLeverage,
        position.sideEntry
      );
      pnlPercentage = pnlCalc.pnlPercentage;
      pnlUSD = pnlCalc.pnl;
    }

    return {
      totalSize: Math.abs(totalSize),
      averageEntryPrice: Math.abs(averageEntryPrice),
      avgLeverage,
      riskAmount,
      rewardAmount,
      riskRewardRatio,
      liquidationPrice: liquidationPrice > 0 ? liquidationPrice : undefined,
      pnlPercentage,
      pnlUSD,
    };
  }, [projectedPosition, position.stopLoss, position.sideEntry, takeProfitPrice, livePrice?.price]);

  // Current position metrics (for open positions only)
  const originalMetrics = useMemo(() => {
    // Only calculate metrics if there's an open position
    if (totals.totalSize <= 0) {
      return {
        riskAmount: 0,
        rewardAmount: 0,
        riskRewardRatio: 0,
        liquidationPrice: undefined,
        pnlPercentage: undefined,
        pnlUSD: undefined,
      };
    }

    // Use updated stop loss if provided, otherwise use current position's stop loss
    const effectiveStopLoss = stopLossPrice ? parseFloat(stopLossPrice) : position.stopLoss;

    const riskAmount = calculateRiskAmount(
      totals.averageEntryPrice,
      effectiveStopLoss,
      totals.totalSize,
      totals.averageLeverage,
      position.sideEntry
    );

    let rewardAmount = 0;
    if (takeProfitPrice) {
      rewardAmount = calculateRewardAmount(
        totals.averageEntryPrice,
        parseFloat(takeProfitPrice),
        totals.totalSize,
        totals.averageLeverage,
        position.sideEntry
      );
    } else if (position.stopLoss) {
      rewardAmount = riskAmount * 2;
    }

    const riskRewardRatio = calculateRiskRewardRatio(riskAmount, rewardAmount);
    const liquidationPrice = calculateLiquidationPrice(
      totals.averageEntryPrice,
      totals.averageLeverage,
      position.sideEntry
    );

    let pnlPercentage = undefined;
    let pnlUSD = undefined;
    if (livePrice?.price) {
      const pnlCalc = calculatePNL(
        totals.averageEntryPrice,
        livePrice.price,
        totals.totalSize,
        totals.averageLeverage,
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
  }, [totals, position.stopLoss, position.sideEntry, takeProfitPrice, stopLossPrice, livePrice?.price]);

  const handleApplyAdjustment = () => {
    if (!proposedAdjustment) return;

    trackPositionAdjusted(
      adjustmentType,
      position.symbol,
      parseFloat(adjustmentSizeUSD)
    );

    const updatedPosition: Position = {
      ...position,
      entries: [
        ...position.entries,
        {
          entryPrice: proposedAdjustment.newEntryPrice,
          size: proposedAdjustment.adjustmentSize,
          leverage: proposedAdjustment.adjustmentLeverage,
          timestamp: new Date(),
          type: proposedAdjustment.type,
          takeProfit: takeProfitPrice ? parseFloat(takeProfitPrice) : position.takeProfit,
          stopLoss: stopLossPrice ? parseFloat(stopLossPrice) : position.stopLoss,
        },
      ],
      stopLoss: stopLossPrice ? parseFloat(stopLossPrice) : position.stopLoss,
      takeProfit: takeProfitPrice ? parseFloat(takeProfitPrice) : position.takeProfit,
      currentPrice: livePrice?.price,
    };

    onPositionUpdate(updatedPosition);

    // Reset form
    setNewEntryPrice('');
    setAdjustmentSizeUSD('');
    setAdjustmentSizePercent('');
    setAdjustmentLeverage('1');
    setSizeInputMode('usd');
  };

  const handleRemoveEntry = (index: number) => {
    if (index === 0) return; // Can't remove initial entry

    const updatedPosition: Position = {
      ...position,
      entries: position.entries.filter((_, i) => i !== index),
    };

    onPositionUpdate(updatedPosition);
  };

  const handleStartEdit = (index: number) => {
    const entry = position.entries[index];
    setEditingEntry({
      index,
      entryPrice: String(entry.entryPrice),
      size: String(entry.size),
      leverage: String(entry.leverage),
      stopLoss: entry.stopLoss ? String(entry.stopLoss) : '',
      takeProfit: entry.takeProfit ? String(entry.takeProfit) : '',
    });
  };

  const handleSaveEdit = () => {
    if (!editingEntry) return;

    const entryPrice = parseFloat(editingEntry.entryPrice);
    const size = parseFloat(editingEntry.size);
    const leverage = parseFloat(editingEntry.leverage);
    const editSL = editingEntry.stopLoss ? parseFloat(editingEntry.stopLoss) : undefined;
    const editTP = editingEntry.takeProfit ? parseFloat(editingEntry.takeProfit) : undefined;

    if (!entryPrice || !size || !leverage) return;

    // Validate SL/TP direction
    if (editSL) {
      if (position.sideEntry === 'long' && editSL >= entryPrice) return;
      if (position.sideEntry === 'short' && editSL <= entryPrice) return;
    }
    if (editTP) {
      if (position.sideEntry === 'long' && editTP <= entryPrice) return;
      if (position.sideEntry === 'short' && editTP >= entryPrice) return;
    }

    const updatedEntries = [...position.entries];
    updatedEntries[editingEntry.index] = {
      ...updatedEntries[editingEntry.index],
      entryPrice,
      size,
      leverage,
      stopLoss: editSL,
      takeProfit: editTP,
    };

    const updatedPosition: Position = {
      ...position,
      entries: updatedEntries,
    };

    onPositionUpdate(updatedPosition);
    setEditingEntry(null);
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
  };

  const formatNumber = (value: number, decimals = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  // Determine which entries to show in chain history
  const entriesToShow = showAllEntries
    ? position.entries
    : position.entries.length <= 2
      ? position.entries
      : position.entries.slice(-2);
  const hiddenCount = position.entries.length - entriesToShow.length;
  const entryStartIndex = showAllEntries ? 0 : position.entries.length - entriesToShow.length;

  return (
    <div className="w-full py-8 sm:py-12">
      {/* Sticky PNL Bar */}
      {livePrice?.price && (
        <div className="sticky top-0 z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 mb-8 bg-[#0A0E27]/95 backdrop-blur-md border-b border-slate-700/50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-600 px-2 py-1 rounded bg-neutral/20 text-neutral">
                {position.symbol}
              </span>
              <span className={`text-xs font-700 px-2 py-1 rounded ${
                position.sideEntry === 'long' ? 'bg-profit/20 text-profit' : 'bg-loss/20 text-loss'
              }`}>
                {position.sideEntry.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="text-right">
                <p className="text-xs text-gray-500">Size</p>
                <p className="font-600 text-metric">${formatNumber(totals.totalSize)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Price</p>
                <p className="font-600 text-metric">${formatNumber(livePrice.price, 2)}</p>
              </div>
              {originalMetrics.pnlPercentage !== undefined && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">PNL</p>
                  <p className={`font-700 ${originalMetrics.pnlPercentage >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {originalMetrics.pnlPercentage >= 0 ? '+' : ''}{formatNumber(originalMetrics.pnlPercentage, 2)}%
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Current Market Price + Position Summary */}
      <div className="mb-20 sm:mb-24 pb-12 sm:pb-16">
        {/* Live Market Price Card */}
        {livePrice?.price && (
          <div className="mb-12 sm:mb-16 card-bg">
            <div className="flex items-center gap-3 mb-6">
              <p className="text-label">Current Market Price</p>
              <span className="text-sm font-600 px-3 py-1 rounded bg-neutral/20 text-neutral">
                {position.symbol.toUpperCase()}
              </span>
            </div>
            <div className="flex items-baseline gap-4 mb-6">
              <p className="text-5xl sm:text-6xl font-700 text-metric">
                ${formatNumber(livePrice.price, 2)}
              </p>
              <p className={`text-lg font-600 ${livePrice.change24h >= 0 ? 'text-profit' : 'text-loss'}`}>
                {livePrice.change24h >= 0 ? '+' : ''}{formatNumber(livePrice.change24h, 2)}% (24h)
              </p>
            </div>
            <div className="text-sm text-gray-400 space-y-2">
              <p>Entry Price: ${formatNumber(totals.averageEntryPrice, 2)}</p>
              <p>Difference: <span className={totals.averageEntryPrice > livePrice.price ? 'text-loss' : 'text-profit'}>
                {totals.averageEntryPrice > livePrice.price ? '−' : '+'}${formatNumber(Math.abs(totals.averageEntryPrice - livePrice.price), 2)}
              </span></p>
            </div>
          </div>
        )}

        <h3 className="text-label mb-12 sm:mb-16">Current Position Summary</h3>

        <div className="space-y-8 sm:space-y-12">
          {/* Total Position Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 sm:gap-16">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <p className="text-label">Total Position Size</p>
                <span className="tooltip-trigger" data-tooltip="Combined USD value of all entries in your position chain">
                  <Info size={16} className="text-neutral/50 hover:text-neutral transition-colors" />
                </span>
              </div>
              <p className="text-4xl sm:text-5xl font-700 text-metric">${formatNumber(totals.totalSize)}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-4">
                <p className="text-label">Average Entry Price</p>
                <span className="tooltip-trigger" data-tooltip="Weighted average price across all entries in your position chain">
                  <Info size={16} className="text-neutral/50 hover:text-neutral transition-colors" />
                </span>
              </div>
              <p className="text-4xl sm:text-5xl font-700 text-metric">${formatNumber(totals.averageEntryPrice)}</p>
            </div>
          </div>

          {/* Average Leverage & Risk/Reward */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 sm:gap-16">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <p className="text-label">Average Leverage</p>
                <span className="tooltip-trigger" data-tooltip="Weighted average leverage across all entries in your position chain">
                  <Info size={16} className="text-neutral/50 hover:text-neutral transition-colors" />
                </span>
              </div>
              <p className="text-4xl sm:text-5xl font-700 text-metric">{formatNumber(totals.averageLeverage, 1)}x</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-4">
                <p className="text-label">Risk/Reward Ratio</p>
                <span className="tooltip-trigger" data-tooltip="For every $1 you risk, you can make $X. Higher is better (2:1 is favorable)">
                  <Info size={16} className="text-neutral/50 hover:text-neutral transition-colors" />
                </span>
              </div>
              <p className="text-4xl sm:text-5xl font-700 text-neutral">1:{formatNumber(originalMetrics.riskRewardRatio, 2)}</p>
            </div>
          </div>

          {/* Risk & Reward */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 sm:gap-16">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <p className="text-label">Max Risk Amount</p>
                <span className="tooltip-trigger" data-tooltip="Maximum USD amount you can lose if stop loss is hit">
                  <Info size={16} className="text-neutral/50 hover:text-neutral transition-colors" />
                </span>
              </div>
              <p className="text-4xl sm:text-5xl font-700 text-loss">${formatNumber(Math.abs(originalMetrics.riskAmount))}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-4">
                <p className="text-label">Max Reward Potential</p>
                <span className="tooltip-trigger" data-tooltip="Maximum USD profit if take profit target is reached">
                  <Info size={16} className="text-neutral/50 hover:text-neutral transition-colors" />
                </span>
              </div>
              <p className="text-4xl sm:text-5xl font-700 text-profit">${formatNumber(originalMetrics.rewardAmount)}</p>
            </div>
          </div>

          {/* PNL & Liquidation */}
          {originalMetrics.pnlPercentage !== undefined && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 sm:gap-16">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <p className="text-label">Current PNL %</p>
                  <span className="tooltip-trigger" data-tooltip="Your current unrealized profit/loss percentage. Includes leverage effect on margin">
                    <Info size={16} className="text-neutral/50 hover:text-neutral transition-colors" />
                  </span>
                </div>
                <p className={`text-4xl sm:text-5xl font-700 ${originalMetrics.pnlPercentage >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {originalMetrics.pnlPercentage >= 0 ? '+' : ''}{formatNumber(originalMetrics.pnlPercentage, 2)}%
                </p>
                {originalMetrics.pnlUSD !== undefined && (
                  <p className={`text-sm mt-3 ${originalMetrics.pnlUSD >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {originalMetrics.pnlUSD >= 0 ? '+' : ''}${formatNumber(originalMetrics.pnlUSD)}
                  </p>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <p className="text-label">Liquidation Price</p>
                  <span className="tooltip-trigger" data-tooltip="Price at which your position will be forcefully closed and margin liquidated">
                    <Info size={16} className="text-neutral/50 hover:text-neutral transition-colors" />
                  </span>
                </div>
                <p className="text-4xl sm:text-5xl font-700 text-metric">
                  ${formatNumber(originalMetrics.liquidationPrice || 0)}
                </p>
              </div>
            </div>
          )}

          {/* Total Realized PNL */}
          {totals.reduceCount > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 sm:gap-16">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <p className="text-label">Total Realized PNL</p>
                  <span className="tooltip-trigger" data-tooltip={`Total profit/loss from ${totals.reduceCount} closed position${totals.reduceCount > 1 ? 's' : ''}`}>
                    <Info size={16} className="text-neutral/50 hover:text-neutral transition-colors" />
                  </span>
                </div>
                <p className={`text-4xl sm:text-5xl font-700 ${totals.totalRealizedPNL >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {totals.totalRealizedPNL >= 0 ? '+' : ''}${formatNumber(totals.totalRealizedPNL)}
                </p>
                <p className="text-xs text-gray-500 mt-2">From {totals.reduceCount} reduction{totals.reduceCount > 1 ? 's' : ''}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Adjustment Section */}
      <div className="mb-20 sm:mb-24 pb-12 sm:pb-16 border-t border-slate-700/50">
        <h3 className="text-label mb-12 sm:mb-16 pt-12 sm:pt-16">Add or Reduce Position</h3>

        <div className="space-y-8 sm:space-y-12">
          {/* Action Toggle */}
          <div className="flex gap-4">
            <button
              onClick={() => setAdjustmentType('add')}
              className={`flex-1 py-4 px-6 rounded-lg font-600 transition-all flex items-center justify-center gap-2 ${
                adjustmentType === 'add'
                  ? 'bg-profit/20 border border-profit text-profit'
                  : 'bg-gray-700/30 border border-gray-600/50 text-gray-400 hover:border-gray-500'
              }`}
            >
              <Plus size={18} />
              <span>Add to Position</span>
            </button>
            <button
              onClick={() => setAdjustmentType('subtract')}
              className={`flex-1 py-4 px-6 rounded-lg font-600 transition-all flex items-center justify-center gap-2 ${
                adjustmentType === 'subtract'
                  ? 'bg-loss/20 border border-loss text-loss'
                  : 'bg-gray-700/30 border border-gray-600/50 text-gray-400 hover:border-gray-500'
              }`}
            >
              <Minus size={18} />
              <span>Reduce Position</span>
            </button>
          </div>

          {/* Input Fields */}
          <div className="space-y-8 sm:space-y-12">
            <div>
              <label className="text-label mb-2 block">
                {adjustmentType === 'add' ? 'Entry Price for this Adjustment' : 'Exit Price (Close Position)'}
              </label>
              <input
                type="number"
                step="0.00000001"
                value={newEntryPrice}
                onChange={(e) => setNewEntryPrice(e.target.value)}
                placeholder={`e.g., ${formatNumber(totals.averageEntryPrice)}`}
                className="input-field w-full text-2xl sm:text-3xl font-600 text-metric"
              />
              {livePrice?.price && (
                <p className="text-xs text-gray-500 mt-3">Current Market Price: ${formatNumber(livePrice.price)}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-label block">
                  {adjustmentType === 'add' ? 'Add Amount' : 'Reduce Amount'}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSizeInputMode('usd');
                      setAdjustmentSizePercent('');
                    }}
                    className={`text-xs px-3 py-1 rounded transition-colors ${
                      sizeInputMode === 'usd'
                        ? 'bg-neutral/30 text-neutral'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    USD
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSizeInputMode('percent');
                      setAdjustmentSizeUSD('');
                    }}
                    className={`text-xs px-3 py-1 rounded transition-colors ${
                      sizeInputMode === 'percent'
                        ? 'bg-neutral/30 text-neutral'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    %
                  </button>
                </div>
              </div>
              {sizeInputMode === 'usd' ? (
                <input
                  type="number"
                  step="0.01"
                  value={adjustmentSizeUSD}
                  onChange={(e) => setAdjustmentSizeUSD(e.target.value)}
                  placeholder="e.g., 1500"
                  className="input-field w-full text-2xl sm:text-3xl font-600 text-metric"
                />
              ) : (
                <div>
                  <input
                    type="number"
                    step="0.1"
                    value={adjustmentSizePercent}
                    onChange={(e) => setAdjustmentSizePercent(e.target.value)}
                    placeholder="e.g., 50"
                    className="input-field w-full text-2xl sm:text-3xl font-600 text-metric"
                  />
                  {adjustmentSizePercent && (
                    <p className="text-xs text-gray-500 mt-3">
                      = ${formatNumber((parseFloat(adjustmentSizePercent) / 100) * totals.totalSize)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {adjustmentType === 'add' && (
              <div>
                <label className="text-label mb-2 block">Leverage for this Adjustment</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  step="0.1"
                  value={adjustmentLeverage}
                  onChange={(e) => setAdjustmentLeverage(e.target.value)}
                  placeholder="e.g., 5"
                  className="input-field w-full text-2xl sm:text-3xl font-600 text-metric"
                />
              </div>
            )}

            <div>
              <label className="text-label mb-2 block">Stop Loss Level (Optional)</label>
              <input
                type="number"
                step="0.00000001"
                value={stopLossPrice}
                onChange={(e) => setStopLossPrice(e.target.value)}
                placeholder={position.stopLoss ? `Current: $${formatNumber(position.stopLoss)}` : 'Set stop loss price'}
                className="input-field w-full text-2xl font-500 text-metric"
              />
              {!stopLossPrice && position.stopLoss && (
                <p className="text-xs text-gray-500 mt-2">Current: ${formatNumber(position.stopLoss)}</p>
              )}
            </div>

            <div>
              <label className="text-label mb-2 block">Take Profit Target (Optional)</label>
              <input
                type="number"
                step="0.00000001"
                value={takeProfitPrice}
                onChange={(e) => setTakeProfitPrice(e.target.value)}
                placeholder={position.takeProfit ? `Current: $${formatNumber(position.takeProfit)}` : 'Enter take profit target'}
                className="input-field w-full text-2xl font-500 text-metric"
              />
              {!takeProfitPrice && position.takeProfit && (
                <p className="text-xs text-gray-500 mt-2">Current: ${formatNumber(position.takeProfit)}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Projected Position After Adjustment */}
      {proposedAdjustment && (
        <div className="mb-20 sm:mb-24 animate-fade-in-up">
          <h3 className="text-label mb-12 sm:mb-16">Projected Position After Adjustment</h3>

          <div className="space-y-8 sm:space-y-12">
            {/* Projected Totals - Before → After format */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 sm:gap-16">
              <div>
                <p className="text-label mb-4">Total Size</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl text-gray-500 font-500">${formatNumber(totals.totalSize)}</p>
                  <span className="text-gray-500">→</span>
                  <p className="text-3xl sm:text-4xl font-700 text-metric">${formatNumber(projected.totalSize)}</p>
                </div>
              </div>
              <div className="border-2 border-neutral/50 rounded-lg p-6">
                <p className="text-label mb-4">Avg Entry</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl text-gray-500 font-500">${formatNumber(totals.averageEntryPrice)}</p>
                  <span className="text-gray-500">→</span>
                  <p className="text-3xl sm:text-4xl font-700 text-metric">${formatNumber(projected.averageEntryPrice)}</p>
                </div>
              </div>
              <div>
                <p className="text-label mb-4">Avg Leverage</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl text-gray-500 font-500">{formatNumber(totals.averageLeverage, 1)}x</p>
                  <span className="text-gray-500">→</span>
                  <p className="text-3xl sm:text-4xl font-700 text-metric">{formatNumber(projected.avgLeverage, 1)}x</p>
                </div>
              </div>
            </div>

            {/* Risk/Reward After */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 sm:gap-16">
              <div>
                <p className="text-label mb-4">Max Loss (if SL hit)</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl text-gray-500 font-500">${formatNumber(Math.abs(originalMetrics.riskAmount))}</p>
                  <span className="text-gray-500">→</span>
                  <p className="text-3xl sm:text-4xl font-700 text-loss">${formatNumber(Math.abs(projected.riskAmount))}</p>
                </div>
              </div>
              <div>
                <p className="text-label mb-4">Max Profit (if TP hit)</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl text-gray-500 font-500">${formatNumber(originalMetrics.rewardAmount)}</p>
                  <span className="text-gray-500">→</span>
                  <p className="text-3xl sm:text-4xl font-700 text-profit">${formatNumber(projected.rewardAmount)}</p>
                </div>
              </div>
            </div>

            {/* New RR Ratio */}
            <div className="metric-card border-2 border-neutral/50">
              <div className="flex items-center gap-2 mb-4">
                <p className="text-label">Risk/Reward Ratio</p>
                <span className="tooltip-trigger" data-tooltip="Updated ratio after this adjustment">
                  <Info size={16} className="text-neutral/50 hover:text-neutral transition-colors" />
                </span>
              </div>
              <div className="flex items-baseline gap-3">
                <p className="text-2xl text-gray-500 font-500">1:{formatNumber(originalMetrics.riskRewardRatio, 2)}</p>
                <span className="text-gray-500">→</span>
                <p className="text-5xl sm:text-6xl font-700 text-neutral">1:{formatNumber(projected.riskRewardRatio, 2)}</p>
              </div>
            </div>

            {/* Projected PNL */}
            {projected.pnlPercentage !== undefined && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 sm:gap-16">
                <div>
                  <p className="text-label mb-4">Current PNL % (at market price)</p>
                  <p className={`text-3xl sm:text-4xl font-700 ${projected.pnlPercentage >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {projected.pnlPercentage >= 0 ? '+' : ''}{formatNumber(projected.pnlPercentage, 2)}%
                  </p>
                </div>
                <div>
                  <p className="text-label mb-4">Current PNL USD (at market price)</p>
                  <p className={`text-3xl sm:text-4xl font-700 ${projected.pnlUSD !== undefined && projected.pnlUSD >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {projected.pnlUSD !== undefined ? (projected.pnlUSD >= 0 ? '+' : '') + formatNumber(projected.pnlUSD) : '$0.00'}
                  </p>
                </div>
              </div>
            )}

            {/* Projected Liquidation */}
            {projected.liquidationPrice && (
              <div className="card-bg">
                <div className="flex items-center gap-2 mb-4">
                  <p className="text-label">Projected Liquidation Price</p>
                  <span className="tooltip-trigger" data-tooltip="Price at which position will be liquidated after this adjustment">
                    <Info size={16} className="text-neutral/50 hover:text-neutral transition-colors" />
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  {originalMetrics.liquidationPrice && (
                    <>
                      <p className="text-xl text-gray-500 font-500">${formatNumber(originalMetrics.liquidationPrice)}</p>
                      <span className="text-gray-500">→</span>
                    </>
                  )}
                  <p className="text-3xl sm:text-4xl font-600 text-metric">${formatNumber(projected.liquidationPrice)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Apply Adjustment Button */}
      {proposedAdjustment && (
        <button
          onClick={handleApplyAdjustment}
          className={`btn-primary w-full py-4 font-600 transition-all mb-20 sm:mb-24 ${
            adjustmentType === 'add'
              ? 'bg-profit/20 border border-profit text-profit hover:bg-profit/30'
              : 'bg-loss/20 border border-loss text-loss hover:bg-loss/30'
          }`}
        >
          {adjustmentType === 'add' ? '✓ Add to Position' : '✓ Reduce Position'}
        </button>
      )}

      {/* Entry Chain History */}
      <div className="mb-20 sm:mb-24 border-t border-slate-700/50 pt-12 sm:pt-16">
        <div className="flex items-center justify-between mb-12 sm:mb-16">
          <div className="flex items-center gap-3">
            <h3 className="text-label">Position Chain History</h3>
            <span className="text-sm font-600 px-3 py-1 rounded bg-neutral/20 text-neutral">
              {position.entries.length} {position.entries.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>
        </div>

        {/* Show more toggle */}
        {hiddenCount > 0 && (
          <button
            onClick={() => setShowAllEntries(true)}
            className="w-full mb-4 py-3 px-4 rounded-lg text-sm font-600 text-gray-400 hover:text-neutral bg-gray-700/20 hover:bg-gray-700/30 border border-gray-700/50 transition-all flex items-center justify-center gap-2"
          >
            <ChevronDown size={16} />
            Show {hiddenCount} earlier {hiddenCount === 1 ? 'entry' : 'entries'}
          </button>
        )}

        {showAllEntries && position.entries.length > 2 && (
          <button
            onClick={() => setShowAllEntries(false)}
            className="w-full mb-4 py-3 px-4 rounded-lg text-sm font-600 text-gray-400 hover:text-neutral bg-gray-700/20 hover:bg-gray-700/30 border border-gray-700/50 transition-all flex items-center justify-center gap-2"
          >
            Show less
          </button>
        )}

        <div className="space-y-4">
          {entriesToShow.map((entry, localIdx) => {
            const idx = entryStartIndex + localIdx;
            // Calculate running total position size up to this entry
            let runningTotalSize = 0;
            for (let i = 0; i <= idx; i++) {
              if (position.entries[i].type === 'subtract') {
                runningTotalSize -= position.entries[i].size;
              } else {
                runningTotalSize += position.entries[i].size;
              }
            }
            runningTotalSize = Math.max(runningTotalSize, 0);

            // Calculate cumulative weighted average entry price using FIFO logic
            let cumulativeWeightedEntryPrice = entry.entryPrice;
            if (entry.type !== 'subtract') {
              // For open entries, calculate the cumulative weighted average up to this point
              let openSize = 0;
              let openWeightedEntryPrice = 0;
              let closedSize = 0;

              for (let i = 0; i <= idx; i++) {
                if (position.entries[i].type === 'subtract') {
                  closedSize += position.entries[i].size;
                } else {
                  openSize += position.entries[i].size;
                  openWeightedEntryPrice += position.entries[i].size * position.entries[i].entryPrice;
                }
              }

              // FIFO: apply closed amounts to oldest entries
              let closedRemaining = closedSize;
              let remainingWeightedEntryPrice = 0;

              for (let i = 0; i <= idx; i++) {
                if (position.entries[i].type !== 'subtract') {
                  if (closedRemaining <= 0) {
                    remainingWeightedEntryPrice += position.entries[i].size * position.entries[i].entryPrice;
                  } else if (closedRemaining < position.entries[i].size) {
                    const remainingFromEntry = position.entries[i].size - closedRemaining;
                    remainingWeightedEntryPrice += remainingFromEntry * position.entries[i].entryPrice;
                    closedRemaining = 0;
                  } else {
                    closedRemaining -= position.entries[i].size;
                  }
                }
              }

              if (runningTotalSize > 0) {
                cumulativeWeightedEntryPrice = remainingWeightedEntryPrice / runningTotalSize;
              }
            }

            // Calculate PNL for this specific entry
            let entryPNL = 0;
            let entryPNLPercent = 0;
            let entryClosePrice = entry.entryPrice;

            if (entry.type === 'subtract') {
              // For reduce entries: calculate PNL from previous average entry to close price
              let prevTotalSize = 0;
              let prevWeightedEntryPrice = 0;
              for (let i = 0; i < idx; i++) {
                prevTotalSize += position.entries[i].type === 'subtract' ? -position.entries[i].size : position.entries[i].size;
                prevWeightedEntryPrice += (position.entries[i].type === 'subtract' ? -position.entries[i].size : position.entries[i].size) * position.entries[i].entryPrice;
              }
              const prevAvgEntry = prevTotalSize !== 0 ? prevWeightedEntryPrice / prevTotalSize : entry.entryPrice;
              const priceDiff = entry.entryPrice - prevAvgEntry;
              entryPNLPercent = (priceDiff / prevAvgEntry) * 100 * (position.sideEntry === 'long' ? 1 : -1) * entry.leverage;
              entryPNL = entry.size * (priceDiff / prevAvgEntry) * (position.sideEntry === 'long' ? 1 : -1) * entry.leverage;
              entryClosePrice = entry.entryPrice;
            } else {
              // For initial/add entries: calculate PNL from entry to current price
              if (livePrice?.price) {
                const priceDiff = livePrice.price - entry.entryPrice;
                entryPNLPercent = (priceDiff / entry.entryPrice) * 100 * (position.sideEntry === 'long' ? 1 : -1) * entry.leverage;
                entryPNL = entry.size * (priceDiff / entry.entryPrice) * (position.sideEntry === 'long' ? 1 : -1) * entry.leverage;
              }
            }

            return (
              <div key={idx} className="card-bg">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-700 ${
                      entry.type === 'initial' ? 'bg-neutral/30 text-neutral' :
                      entry.type === 'add' ? 'bg-profit/20 text-profit' :
                      'bg-loss/20 text-loss'
                    }`}>
                      {entry.type === 'initial' ? '●' : entry.type === 'add' ? '+' : '−'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-label capitalize">{entry.type === 'initial' ? 'Initial Entry' : entry.type === 'add' ? 'Add Position' : 'Reduce Position'}</p>
                        {entry.type === 'initial' && (
                          <span className={`text-xs font-700 px-2 py-1 rounded ${
                            position.sideEntry === 'long'
                              ? 'bg-profit/20 text-profit'
                              : 'bg-loss/20 text-loss'
                          }`}>
                            {position.sideEntry.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{new Date(entry.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {editingEntry?.index !== idx && (
                      <button
                        onClick={() => handleStartEdit(idx)}
                        className="text-gray-400 hover:text-neutral transition-colors"
                        title="Edit this entry"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                    {idx === 0 && onReset ? (
                      <button
                        onClick={onReset}
                        className="text-gray-400 hover:text-neutral transition-colors"
                        title="Reset position"
                      >
                        <RotateCcw size={16} />
                      </button>
                    ) : idx > 0 ? (
                      <button
                        onClick={() => handleRemoveEntry(idx)}
                        className="text-gray-400 hover:text-loss transition-colors"
                        title="Remove this entry"
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 sm:gap-6">
                    <div>
                      <p className="text-xs text-gray-500 mb-2">
                        {entry.type === 'subtract' ? 'Close Price' : entry.type === 'add' ? 'Avg Entry (after add)' : 'Entry Price'}
                      </p>
                      <p className="text-lg sm:text-xl font-600 text-metric">
                        ${formatNumber(entry.type === 'add' ? cumulativeWeightedEntryPrice : entry.entryPrice)}
                      </p>
                      {entry.type === 'add' && (
                        <p className="text-xs text-gray-400 mt-1">Entry: ${formatNumber(entry.entryPrice)}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Size (USD)</p>
                      <p className="text-lg sm:text-xl font-600 text-metric">${formatNumber(entry.size)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Total Position</p>
                      <p className="text-lg sm:text-xl font-600 text-metric">${formatNumber(runningTotalSize)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Leverage</p>
                      <p className="text-lg sm:text-xl font-600 text-metric">{formatNumber(entry.leverage, 1)}x</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-2">{entry.type === 'subtract' ? 'Realized PNL %' : 'Current PNL %'}</p>
                      <p className={`text-lg sm:text-xl font-600 ${entryPNLPercent >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {entryPNLPercent >= 0 ? '+' : ''}{formatNumber(entryPNLPercent, 2)}%
                      </p>
                    </div>
                  </div>

                {/* Stop Loss Info */}
                {(() => {
                  const entrySL = entry.stopLoss ?? position.stopLoss;
                  if (!entrySL || entry.type === 'subtract') return null;

                  const refPrice = entry.type === 'add' ? cumulativeWeightedEntryPrice : entry.entryPrice;
                  const slPriceDiff = entrySL - refPrice;
                  const slPNLPercent = (slPriceDiff / refPrice) * 100 * (position.sideEntry === 'long' ? 1 : -1) * entry.leverage;
                  const slPNLUSD = entry.size * (slPriceDiff / refPrice) * (position.sideEntry === 'long' ? 1 : -1) * entry.leverage;

                  return (
                    <div className="mt-4 pt-4 border-t border-gray-700/50">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs text-gray-500 mb-2">Stop Loss Level</p>
                          <p className="text-lg font-600 text-loss">${formatNumber(entrySL)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-2">PNL if SL Hit</p>
                          <div className="space-y-1">
                            <p className={`text-lg font-600 ${slPNLUSD >= 0 ? 'text-profit' : 'text-loss'}`}>
                              {slPNLUSD >= 0 ? '+' : ''}${formatNumber(slPNLUSD, 2)}
                            </p>
                            <p className={`text-xs ${slPNLPercent >= 0 ? 'text-profit' : 'text-loss'}`}>
                              {slPNLPercent >= 0 ? '+' : ''}{formatNumber(slPNLPercent, 2)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* PNL Details */}
                {entry.type === 'subtract' ? (
                  <div className="mt-4 pt-4 border-t border-gray-700/50">
                    {/* For reduce entries, show realized PNL and current PNL of remaining side by side */}
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Realized PNL (USD)</p>
                        <p className={`text-lg font-600 ${entryPNL >= 0 ? 'text-profit' : 'text-loss'}`}>
                          {entryPNL >= 0 ? '+' : ''}${formatNumber(entryPNL, 2)}
                        </p>
                      </div>

                      {/* For reduce entries, also show current PNL of remaining position */}
                      {runningTotalSize > 0 && livePrice?.price && (
                        <div>
                          {(() => {
                            // Calculate current PNL of the remaining position
                            let remainingAvgEntry = 0;
                            let remainingSize = 0;
                            let remainingLeverage = 1;

                            // Calculate remaining position metrics at this point
                            let openSize = 0;
                            let openLeveragedCapital = 0;
                            let openWeightedEntryPrice = 0;
                            let closedSize = 0;

                            for (let i = 0; i <= idx; i++) {
                              if (position.entries[i].type === 'subtract') {
                                closedSize += position.entries[i].size;
                              } else {
                                openSize += position.entries[i].size;
                                openLeveragedCapital += position.entries[i].size * position.entries[i].leverage;
                                openWeightedEntryPrice += position.entries[i].size * position.entries[i].entryPrice;
                              }
                            }

                            remainingSize = Math.max(openSize - closedSize, 0);
                            if (openSize > 0 && remainingSize > 0) {
                              const scaleFactor = remainingSize / openSize;
                              remainingAvgEntry = (openWeightedEntryPrice * scaleFactor) / remainingSize;
                              remainingLeverage = (openLeveragedCapital * scaleFactor) / remainingSize;
                            }

                            const remainingPriceDiff = livePrice.price - remainingAvgEntry;
                            const remainingPNLPercent = (remainingPriceDiff / remainingAvgEntry) * 100 * (position.sideEntry === 'long' ? 1 : -1) * remainingLeverage;
                            const remainingPNLUSD = remainingSize * (remainingPriceDiff / remainingAvgEntry) * (position.sideEntry === 'long' ? 1 : -1) * remainingLeverage;

                            return (
                              <div>
                                <p className="text-xs text-gray-500 mb-2">Current PNL of Remaining (USD)</p>
                                <div className="space-y-1">
                                  <p className={`text-lg font-600 ${remainingPNLUSD >= 0 ? 'text-profit' : 'text-loss'}`}>
                                    {remainingPNLUSD >= 0 ? '+' : ''}${formatNumber(remainingPNLUSD, 2)}
                                  </p>
                                  <p className={`text-xs ${remainingPNLPercent >= 0 ? 'text-profit' : 'text-loss'}`}>
                                    {remainingPNLPercent >= 0 ? '+' : ''}{formatNumber(remainingPNLPercent, 2)}%
                                  </p>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Potential Profit at TP for remaining position after reduce */}
                    {(() => {
                      const reduceTP = entry.takeProfit ?? position.takeProfit;
                      if (!reduceTP || reduceTP === 0 || runningTotalSize <= 0) return null;

                      // Calculate remaining position metrics at this point
                      let openSize = 0;
                      let openLeveragedCapital = 0;
                      let openWeightedEntryPrice = 0;
                      let closedSize = 0;

                      for (let i = 0; i <= idx; i++) {
                        if (position.entries[i].type === 'subtract') {
                          closedSize += position.entries[i].size;
                        } else {
                          openSize += position.entries[i].size;
                          openLeveragedCapital += position.entries[i].size * position.entries[i].leverage;
                          openWeightedEntryPrice += position.entries[i].size * position.entries[i].entryPrice;
                        }
                      }

                      const remainingSize = Math.max(openSize - closedSize, 0);
                      if (remainingSize <= 0 || openSize <= 0) return null;

                      const scaleFactor = remainingSize / openSize;
                      const remainingAvgEntry = (openWeightedEntryPrice * scaleFactor) / remainingSize;
                      const remainingLeverage = (openLeveragedCapital * scaleFactor) / remainingSize;

                      const tpPriceDiff = reduceTP - remainingAvgEntry;
                      const tpPNLPercent = (tpPriceDiff / remainingAvgEntry) * 100 * (position.sideEntry === 'long' ? 1 : -1) * remainingLeverage;
                      const tpPNLUSD = remainingSize * (tpPriceDiff / remainingAvgEntry) * (position.sideEntry === 'long' ? 1 : -1) * remainingLeverage;

                      return (
                        <div className="mt-4 pt-4 border-t border-gray-700/50">
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <p className="text-xs text-gray-500 mb-2">Take Profit Level</p>
                              <p className="text-lg font-600 text-profit">${formatNumber(reduceTP)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-2">Potential Profit at TP (Remaining)</p>
                              <div className="space-y-1">
                                <p className={`text-lg font-600 ${tpPNLUSD >= 0 ? 'text-profit' : 'text-loss'}`}>
                                  {tpPNLUSD >= 0 ? '+' : ''}${formatNumber(tpPNLUSD, 2)}
                                </p>
                                <p className={`text-xs ${tpPNLPercent >= 0 ? 'text-profit' : 'text-loss'}`}>
                                  {tpPNLPercent >= 0 ? '+' : ''}{formatNumber(tpPNLPercent, 2)}%
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-gray-700/50">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Current PNL (USD)</p>
                        <p className={`text-lg font-600 ${entryPNL >= 0 ? 'text-profit' : 'text-loss'}`}>
                          {entryPNL >= 0 ? '+' : ''}${formatNumber(entryPNL, 2)}
                        </p>
                      </div>

                      {/* Show potential profit at take profit level */}
                      {(() => {
                        const entryTP = entry.takeProfit ?? position.takeProfit;
                        if (!entryTP || entryTP === 0) return null;

                        const tpPriceDiff = entryTP - cumulativeWeightedEntryPrice;
                        const tpPNLPercent = (tpPriceDiff / cumulativeWeightedEntryPrice) * 100 * (position.sideEntry === 'long' ? 1 : -1) * entry.leverage;
                        const tpPNLUSD = entry.size * (tpPriceDiff / cumulativeWeightedEntryPrice) * (position.sideEntry === 'long' ? 1 : -1) * entry.leverage;

                        return (
                          <div>
                            <p className="text-xs text-gray-500 mb-2">Potential Profit at TP (${formatNumber(entryTP)})</p>
                            <div className="space-y-1">
                              <p className={`text-lg font-600 ${tpPNLUSD >= 0 ? 'text-profit' : 'text-loss'}`}>
                                {tpPNLUSD >= 0 ? '+' : ''}${formatNumber(tpPNLUSD, 2)}
                              </p>
                              <p className={`text-xs ${tpPNLPercent >= 0 ? 'text-profit' : 'text-loss'}`}>
                                {tpPNLPercent >= 0 ? '+' : ''}{formatNumber(tpPNLPercent, 2)}%
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Entry Modal */}
      {editingEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-md w-full p-6 space-y-6">
            <div>
              <h2 className="text-lg font-700 text-metric">Edit Entry</h2>
              <p className="text-xs text-gray-500 mt-1">
                {position.entries[editingEntry.index].type === 'initial' ? 'Initial Entry' :
                 position.entries[editingEntry.index].type === 'add' ? 'Add Position' : 'Reduce Position'}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-2 block font-600">Entry Price</label>
                <input
                  type="number"
                  step="0.00000001"
                  value={editingEntry.entryPrice}
                  onChange={(e) => setEditingEntry({ ...editingEntry, entryPrice: e.target.value })}
                  className="input-field w-full text-lg font-600 text-metric"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-2 block font-600">Size (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingEntry.size}
                  onChange={(e) => setEditingEntry({ ...editingEntry, size: e.target.value })}
                  className="input-field w-full text-lg font-600 text-metric"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-2 block font-600">Leverage</label>
                <input
                  type="number"
                  step="0.1"
                  value={editingEntry.leverage}
                  onChange={(e) => setEditingEntry({ ...editingEntry, leverage: e.target.value })}
                  className="input-field w-full text-lg font-600 text-metric"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-2 block font-600">
                  Stop Loss {position.sideEntry === 'long' ? '(below entry)' : '(above entry)'}
                </label>
                <input
                  type="number"
                  step="0.00000001"
                  value={editingEntry.stopLoss}
                  onChange={(e) => setEditingEntry({ ...editingEntry, stopLoss: e.target.value })}
                  placeholder="Optional"
                  className="input-field w-full text-lg font-600 text-metric"
                />
                {editingEntry.stopLoss && (() => {
                  const sl = parseFloat(editingEntry.stopLoss);
                  const ep = parseFloat(editingEntry.entryPrice);
                  if (!sl || !ep) return null;
                  const invalid = (position.sideEntry === 'long' && sl >= ep) || (position.sideEntry === 'short' && sl <= ep);
                  if (!invalid) return null;
                  return <p className="text-xs text-loss mt-1">SL must be {position.sideEntry === 'long' ? 'below' : 'above'} entry for {position.sideEntry.toUpperCase()}</p>;
                })()}
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-2 block font-600">
                  Take Profit {position.sideEntry === 'long' ? '(above entry)' : '(below entry)'}
                </label>
                <input
                  type="number"
                  step="0.00000001"
                  value={editingEntry.takeProfit}
                  onChange={(e) => setEditingEntry({ ...editingEntry, takeProfit: e.target.value })}
                  placeholder="Optional"
                  className="input-field w-full text-lg font-600 text-metric"
                />
                {editingEntry.takeProfit && (() => {
                  const tp = parseFloat(editingEntry.takeProfit);
                  const ep = parseFloat(editingEntry.entryPrice);
                  if (!tp || !ep) return null;
                  const invalid = (position.sideEntry === 'long' && tp <= ep) || (position.sideEntry === 'short' && tp >= ep);
                  if (!invalid) return null;
                  return <p className="text-xs text-loss mt-1">TP must be {position.sideEntry === 'long' ? 'above' : 'below'} entry for {position.sideEntry.toUpperCase()}</p>;
                })()}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancelEdit}
                className="flex-1 px-4 py-3 rounded-lg text-sm font-600 text-gray-400 hover:text-gray-300 bg-gray-700/30 hover:bg-gray-700/50 transition-colors flex items-center justify-center gap-2"
              >
                <X size={16} />
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-4 py-3 rounded-lg text-sm font-600 text-profit bg-profit/20 hover:bg-profit/30 border border-profit transition-colors flex items-center justify-center gap-2"
              >
                <Check size={16} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
