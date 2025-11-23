import { Position, PositionAdjustment, CalculatedPosition } from '@/types/position';

/**
 * Calculate the average entry price after position adjustment
 */
export const calculateAverageEntryPrice = (
  originalSize: number,
  originalPrice: number,
  adjustmentSize: number,
  adjustmentPrice: number,
  adjustmentType: 'add' | 'subtract'
): number => {
  if (adjustmentType === 'subtract') {
    // When subtracting, use FIFO or weighted average
    // For simplicity, we calculate the remaining position
    const remainingSize = originalSize - adjustmentSize;
    if (remainingSize <= 0) return adjustmentPrice;
    return originalPrice; // Keep original entry price for remaining position
  }

  // When adding (averaging down or up)
  const totalSize = originalSize + adjustmentSize;
  const totalCost = originalSize * originalPrice + adjustmentSize * adjustmentPrice;
  return totalCost / totalSize;
};

/**
 * Calculate risk amount based on entry and stop loss
 * IMPORTANT: Uses NOTIONAL position size (positionSize * leverage)
 */
export const calculateRiskAmount = (
  entryPrice: number,
  stopLoss: number | undefined,
  positionSize: number,
  leverage: number,
  direction: 'long' | 'short'
): number => {
  if (!stopLoss) return 0;

  // Calculate notional position size (margin * leverage)
  const notionalSize = positionSize * leverage;

  const priceDifference = Math.abs(entryPrice - stopLoss);
  const riskPercentage = priceDifference / entryPrice;

  return notionalSize * riskPercentage;
};

/**
 * Calculate potential reward based on target price
 * IMPORTANT: Uses NOTIONAL position size (positionSize * leverage)
 * Direction-aware: correctly calculates profit for both LONG and SHORT
 */
export const calculateRewardAmount = (
  entryPrice: number,
  targetPrice: number,
  positionSize: number,
  leverage: number,
  direction: 'long' | 'short'
): number => {
  if (!targetPrice || entryPrice === targetPrice) return 0;

  const notionalSize = positionSize * leverage;

  // For LONG: profit when price goes UP (target > entry)
  // For SHORT: profit when price goes DOWN (target < entry)
  const isValidTarget = direction === 'long'
    ? targetPrice > entryPrice
    : targetPrice < entryPrice;

  if (!isValidTarget) return 0;

  const priceDifference = Math.abs(targetPrice - entryPrice);
  const rewardPercentage = priceDifference / entryPrice;

  return notionalSize * rewardPercentage;
};

/**
 * Calculate risk/reward ratio
 */
export const calculateRiskRewardRatio = (
  risk: number,
  reward: number
): number => {
  if (risk === 0 || reward === 0) return 0;
  return reward / risk;
};

/**
 * Calculate current PNL based on current price
 * PNL % includes leverage multiplier (return on margin)
 * PNL USD is the dollar profit on the margin (includes leverage)
 */
export const calculatePNL = (
  entryPrice: number,
  currentPrice: number,
  positionSize: number,
  leverage: number,
  direction: 'long' | 'short'
): { pnl: number; pnlPercentage: number } => {
  const priceDifference = currentPrice - entryPrice;
  const direction_multiplier = direction === 'long' ? 1 : -1;
  // PNL % is the price movement percentage multiplied by leverage
  const pnlPercentage = (priceDifference / entryPrice) * 100 * direction_multiplier * leverage;
  // PNL in USD is margin * (price movement %) * leverage * direction
  const pnl = positionSize * (priceDifference / entryPrice) * direction_multiplier * leverage;

  return {
    pnl,
    pnlPercentage,
  };
};

/**
 * Calculate liquidation price
 * Formula: For Long: Entry Price * (1 - 1/Leverage)
 * Formula: For Short: Entry Price * (1 + 1/Leverage)
 */
export const calculateLiquidationPrice = (
  entryPrice: number,
  leverage: number,
  direction: 'long' | 'short'
): number => {
  if (leverage === 1) return 0; // No liquidation at 1x leverage

  const liquidationMultiplier = 1 / leverage;

  if (direction === 'long') {
    return entryPrice * (1 - liquidationMultiplier);
  } else {
    return entryPrice * (1 + liquidationMultiplier);
  }
};

/**
 * Calculate total position after adjustment
 * Handles both ADD and SUBTRACT operations with accurate math
 * Properly handles LONG vs SHORT positions
 * Works with the new entries array structure in Position
 * @param currentPrice - Current market price for PNL calculation (should be live price)
 */
export const calculateAdjustedPosition = (
  originalPosition: Position,
  adjustment: PositionAdjustment,
  currentPrice?: number
): CalculatedPosition => {
  const { stopLoss, takeProfit, currentPrice: positionCurrentPrice, sideEntry, entries } = originalPosition;
  const { newEntryPrice, adjustmentSize, adjustmentLeverage, type, takeProfit: adjustmentTP } = adjustment;

  // Calculate totals from entries array
  let totalSize = 0;
  let totalLeveragedCapital = 0;
  let weightedEntryPrice = 0;

  for (const entry of entries) {
    totalSize += entry.type === 'subtract' ? -entry.size : entry.size;
    totalLeveragedCapital += (entry.type === 'subtract' ? -entry.size : entry.size) * entry.leverage;
    weightedEntryPrice += (entry.type === 'subtract' ? -entry.size : entry.size) * entry.entryPrice;
  }

  const averageEntryPrice = totalSize !== 0 ? weightedEntryPrice / totalSize : 0;
  const averageLeverage = totalSize !== 0 ? Math.abs(totalLeveragedCapital / totalSize) : 1;

  // Add the new adjustment
  totalSize += type === 'add' ? adjustmentSize : -adjustmentSize;
  totalLeveragedCapital += (type === 'add' ? adjustmentSize : -adjustmentSize) * adjustmentLeverage;
  weightedEntryPrice += (type === 'add' ? adjustmentSize : -adjustmentSize) * newEntryPrice;

  const newAverageEntryPrice = totalSize !== 0 ? Math.abs(weightedEntryPrice / totalSize) : 0;
  const newAverageLeverage = totalSize !== 0 ? Math.abs(totalLeveragedCapital / totalSize) : 1;

  // Use adjustment's takeProfit if provided, otherwise use original
  const effectiveTP = adjustmentTP !== undefined ? adjustmentTP : takeProfit;

  // Calculate risk based on stop loss
  const riskAmount = calculateRiskAmount(
    newAverageEntryPrice,
    stopLoss,
    Math.abs(totalSize),
    newAverageLeverage,
    sideEntry
  );

  // Calculate reward using ACTUAL take profit price (not assumed 2:1 ratio)
  const rewardAmount = effectiveTP
    ? calculateRewardAmount(newAverageEntryPrice, effectiveTP, Math.abs(totalSize), newAverageLeverage, sideEntry)
    : 0;

  // Calculate risk/reward ratio
  const riskRewardRatio = calculateRiskRewardRatio(riskAmount, rewardAmount);

  // Calculate PNL if current price is available (use passed-in price, fallback to position price)
  let pnl = undefined;
  let pnlPercentage = undefined;
  const priceForCalc = currentPrice ?? positionCurrentPrice;
  if (priceForCalc) {
    const pnlCalc = calculatePNL(
      newAverageEntryPrice,
      priceForCalc,
      Math.abs(totalSize),
      newAverageLeverage,
      sideEntry
    );
    pnl = pnlCalc.pnl;
    pnlPercentage = pnlCalc.pnlPercentage;
  }

  // Calculate liquidation price
  const liquidationPrice = calculateLiquidationPrice(
    newAverageEntryPrice,
    newAverageLeverage,
    sideEntry
  );

  return {
    averageEntryPrice: newAverageEntryPrice,
    totalSize: Math.abs(totalSize),
    totalCapital: Math.abs(totalSize),
    riskAmount,
    rewardAmount,
    riskRewardRatio,
    pnl,
    pnlPercentage,
    liquidationPrice: liquidationPrice > 0 ? liquidationPrice : undefined,
  };
};
