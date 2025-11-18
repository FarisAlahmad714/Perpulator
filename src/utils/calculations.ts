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
 * Calculate potential reward (using a target price or multiplier)
 * IMPORTANT: Uses NOTIONAL position size (positionSize * leverage)
 */
export const calculateRewardAmount = (
  entryPrice: number,
  targetPrice: number,
  positionSize: number,
  leverage: number,
  direction: 'long' | 'short'
): number => {
  // Calculate notional position size (margin * leverage)
  const notionalSize = positionSize * leverage;

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
  const pnlPercentage = (priceDifference / entryPrice) * 100 * direction_multiplier;
  const pnl = (positionSize / entryPrice) * priceDifference * direction_multiplier;

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
 */
export const calculateAdjustedPosition = (
  originalPosition: Position,
  adjustment: PositionAdjustment
): CalculatedPosition => {
  const { entryPrice, positionSize, leverage, stopLoss, currentPrice, sideEntry } =
    originalPosition;
  const { newEntryPrice, adjustmentSize, type } = adjustment;

  // Calculate new average entry price
  const newTotalSize = type === 'add' ? positionSize + adjustmentSize : positionSize - adjustmentSize;
  const averageEntryPrice = calculateAverageEntryPrice(
    positionSize,
    entryPrice,
    adjustmentSize,
    newEntryPrice,
    type
  );

  // Calculate risk and reward
  const riskAmount = calculateRiskAmount(
    averageEntryPrice,
    stopLoss,
    newTotalSize,
    leverage,
    sideEntry
  );

  // For reward, assume 2:1 risk/reward ratio target or use a fixed target price
  // Here we'll calculate based on the stop loss distance
  const rewardAmount = stopLoss ? riskAmount * 2 : 0; // 2:1 ratio

  const riskRewardRatio = calculateRiskRewardRatio(riskAmount, rewardAmount);

  // Calculate PNL if current price is available
  let pnl = undefined;
  let pnlPercentage = undefined;
  if (currentPrice) {
    const pnlCalc = calculatePNL(
      averageEntryPrice,
      currentPrice,
      newTotalSize,
      leverage,
      sideEntry
    );
    pnl = pnlCalc.pnl;
    pnlPercentage = pnlCalc.pnlPercentage;
  }

  // Calculate liquidation price
  const liquidationPrice = calculateLiquidationPrice(
    averageEntryPrice,
    leverage,
    sideEntry
  );

  return {
    averageEntryPrice,
    totalSize: newTotalSize,
    totalCapital: newTotalSize,
    riskAmount,
    rewardAmount,
    riskRewardRatio,
    pnl,
    pnlPercentage,
    liquidationPrice: liquidationPrice > 0 ? liquidationPrice : undefined,
  };
};
