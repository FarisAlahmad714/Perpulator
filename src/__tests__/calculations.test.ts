/**
 * Comprehensive test suite for calculation functions
 * Tests all calculation utilities with verified edge cases and user test cases
 */

import {
  calculateAverageEntryPrice,
  calculateRiskAmount,
  calculateRewardAmount,
  calculateRiskRewardRatio,
  calculatePNL,
  calculateLiquidationPrice,
  calculateAdjustedPosition,
} from '@/utils/calculations';

describe('calculateAverageEntryPrice', () => {
  it('should calculate average entry price when adding to position', () => {
    // Adding $1000 at $100 to existing $1000 at $95
    const result = calculateAverageEntryPrice(1000, 95, 1000, 100, 'add');
    expect(result).toBeCloseTo(97.5, 2);
  });

  it('should calculate average entry price when averaging down', () => {
    // Adding $1000 at $90 to existing $1000 at $100
    const result = calculateAverageEntryPrice(1000, 100, 1000, 90, 'add');
    expect(result).toBeCloseTo(95, 2);
  });

  it('should keep original price when subtracting partial position', () => {
    const result = calculateAverageEntryPrice(2000, 100, 500, 105, 'subtract');
    expect(result).toBeCloseTo(100, 2);
  });

  it('should return adjustment price when subtracting entire position', () => {
    const result = calculateAverageEntryPrice(1000, 100, 1000, 105, 'subtract');
    expect(result).toBeCloseTo(105, 2);
  });

  it('should handle unequal position sizes', () => {
    // $500 at $100 + $1500 at $110 = $2000 total
    // Average = (500*100 + 1500*110) / 2000 = 107.5
    const result = calculateAverageEntryPrice(500, 100, 1500, 110, 'add');
    expect(result).toBeCloseTo(107.5, 2);
  });
});

describe('calculateRiskAmount', () => {
  it('should calculate risk with leverage factored in', () => {
    // $1000 at $100 entry, $95 stop loss, 2x leverage
    // Notional = $1000 * 2 = $2000
    // Risk % = (100-95)/100 = 0.05 = 5%
    // Risk amount = $2000 * 0.05 = $100
    const result = calculateRiskAmount(100, 95, 1000, 2, 'long');
    expect(result).toBeCloseTo(100, 2);
  });

  it('should return 0 when no stop loss is set', () => {
    const result = calculateRiskAmount(100, undefined, 1000, 2, 'long');
    expect(result).toEqual(0);
  });

  it('should handle high leverage positions', () => {
    // $1000 at $102,500 entry, $104,500 stop loss, 7x leverage
    // Notional = $1000 * 7 = $7000
    // Risk % = (104,500 - 102,500) / 102,500 = 2000/102,500 ≈ 0.0195
    // Risk amount = $7000 * 0.0195 ≈ $136.59
    const result = calculateRiskAmount(102500, 104500, 1000, 7, 'short');
    expect(result).toBeCloseTo(136.59, 0);
  });

  it('should calculate correctly for SHORT positions', () => {
    // SHORT: $1500 at $102,500 entry, $104,500 stop loss, 7x leverage
    // Notional = $1500 * 7 = $10,500
    // Risk % = (104,500 - 102,500) / 102,500 = 2000/102,500 ≈ 0.01951
    // Risk amount = $10,500 * 0.01951 ≈ $204.88
    const result = calculateRiskAmount(102500, 104500, 1500, 7, 'short');
    expect(result).toBeCloseTo(204.88, 1);
  });

  it('should work for LONG positions with leverage', () => {
    // LONG: $2000 at $50 entry, $40 stop loss, 5x leverage
    // Notional = $2000 * 5 = $10,000
    // Risk % = (50-40)/50 = 10/50 = 0.2 = 20%
    // Risk amount = $10,000 * 0.2 = $2,000
    const result = calculateRiskAmount(50, 40, 2000, 5, 'long');
    expect(result).toBeCloseTo(2000, 2);
  });

  it('should handle very small position sizes', () => {
    // $100 at $1000 entry, $900 stop loss, 2x leverage
    // Notional = $100 * 2 = $200
    // Risk % = (1000-900)/1000 = 100/1000 = 0.1
    // Risk amount = $200 * 0.1 = $20
    const result = calculateRiskAmount(1000, 900, 100, 2, 'long');
    expect(result).toBeCloseTo(20, 2);
  });
});

describe('calculateRewardAmount', () => {
  it('should calculate reward with leverage factored in', () => {
    // $1000 at $100 entry, $110 target, 2x leverage
    // Notional = $1000 * 2 = $2000
    // Reward % = (110-100)/100 = 0.1 = 10%
    // Reward amount = $2000 * 0.1 = $200
    const result = calculateRewardAmount(100, 110, 1000, 2, 'long');
    expect(result).toBeCloseTo(200, 2);
  });

  it('should calculate correctly for SHORT positions', () => {
    // SHORT: $1500 at $102,500 entry, $90,415 target, 7x leverage
    // Notional = $1500 * 7 = $10,500
    // Reward % = (102,500 - 90,415) / 102,500 = 12,085 / 102,500 ≈ 0.1179
    // Reward amount = $10,500 * 0.1179 ≈ $1,237.95
    const result = calculateRewardAmount(102500, 90415, 1500, 7, 'short');
    expect(result).toBeCloseTo(1237.98, 0);
  });

  it('should work for large target prices', () => {
    // LONG: $5000 at $60,000 entry, $70,000 target, 10x leverage
    // Notional = $5000 * 10 = $50,000
    // Reward % = (70,000 - 60,000) / 60,000 = 10,000 / 60,000 ≈ 0.1667
    // Reward amount = $50,000 * 0.1667 ≈ $8,335
    const result = calculateRewardAmount(60000, 70000, 5000, 10, 'long');
    expect(result).toBeCloseTo(8333.33, 0);
  });

  it('should handle negative direction (SHORT) with lower target', () => {
    // SHORT: $2000 at $100 entry, $80 target, 3x leverage
    // Notional = $2000 * 3 = $6000
    // Reward % = (100 - 80) / 100 = 20/100 = 0.2
    // Reward amount = $6000 * 0.2 = $1,200
    const result = calculateRewardAmount(100, 80, 2000, 3, 'short');
    expect(result).toBeCloseTo(1200, 2);
  });
});

describe('calculateRiskRewardRatio', () => {
  it('should calculate 1:2 ratio correctly', () => {
    const result = calculateRiskRewardRatio(100, 200);
    expect(result).toBeCloseTo(2, 2);
  });

  it('should calculate 1:6 ratio correctly', () => {
    // From user test case: $204.88 risk, $1,237.98 reward
    // Ratio = 1,237.98 / 204.88 ≈ 6.04
    const result = calculateRiskRewardRatio(204.88, 1237.98);
    expect(result).toBeCloseTo(6.04, 1);
  });

  it('should return 0 when risk is 0', () => {
    const result = calculateRiskRewardRatio(0, 100);
    expect(result).toEqual(0);
  });

  it('should return 0 when reward is 0', () => {
    const result = calculateRiskRewardRatio(100, 0);
    expect(result).toEqual(0);
  });

  it('should handle small ratios', () => {
    const result = calculateRiskRewardRatio(100, 50);
    expect(result).toBeCloseTo(0.5, 2);
  });

  it('should handle very large ratios', () => {
    const result = calculateRiskRewardRatio(10, 5000);
    expect(result).toBeCloseTo(500, 0);
  });
});

describe('calculatePNL', () => {
  it('should calculate profit for LONG position', () => {
    // LONG: $2000 at $100 entry, current $110, 1x leverage
    // PNL = (2000/100) * (110-100) * 1 = 20 * 10 = $200
    // PNL% = ((110-100)/100) * 100 = 10%
    const result = calculatePNL(100, 110, 2000, 1, 'long');
    expect(result.pnl).toBeCloseTo(200, 0);
    expect(result.pnlPercentage).toBeCloseTo(10, 1);
  });

  it('should calculate loss for LONG position', () => {
    // LONG: $2000 at $100 entry, current $90, 1x leverage
    // PNL = (2000/100) * (90-100) * 1 = 20 * (-10) = -$200
    // PNL% = ((90-100)/100) * 100 = -10%
    const result = calculatePNL(100, 90, 2000, 1, 'long');
    expect(result.pnl).toBeCloseTo(-200, 0);
    expect(result.pnlPercentage).toBeCloseTo(-10, 1);
  });

  it('should calculate profit for SHORT position', () => {
    // SHORT: $1500 at $102,500 entry, current $100,000, 7x leverage
    // Price difference = 100,000 - 102,500 = -2,500
    // Direction multiplier for SHORT = -1
    // PNL% = (-2,500 / 102,500) * 100 * (-1) = 2.44%
    // PNL = (1500/102,500) * (-2,500) * (-1) ≈ $36.59
    const result = calculatePNL(102500, 100000, 1500, 7, 'short');
    expect(result.pnl).toBeCloseTo(36.59, 1);
    expect(result.pnlPercentage).toBeCloseTo(2.44, 1);
  });

  it('should handle leveraged positions', () => {
    // LONG: $1000 at $50 entry, current $60, 5x leverage
    // PNL = (1000/50) * (60-50) = 20 * 10 = $200
    // PNL% = ((60-50)/50) * 100 = 20%
    const result = calculatePNL(50, 60, 1000, 5, 'long');
    expect(result.pnl).toBeCloseTo(200, 0);
    expect(result.pnlPercentage).toBeCloseTo(20, 1);
  });

  it('should calculate zero PNL at entry price', () => {
    const result = calculatePNL(100, 100, 1000, 2, 'long');
    expect(result.pnl).toBeCloseTo(0, 1);
    expect(result.pnlPercentage).toBeCloseTo(0, 1);
  });
});

describe('calculateLiquidationPrice', () => {
  it('should return 0 for 1x leverage', () => {
    const result = calculateLiquidationPrice(100, 1, 'long');
    expect(result).toEqual(0);
  });

  it('should calculate LONG liquidation price', () => {
    // LONG: $100 entry, 2x leverage
    // Liquidation = 100 * (1 - 1/2) = 100 * 0.5 = $50
    const result = calculateLiquidationPrice(100, 2, 'long');
    expect(result).toBeCloseTo(50, 2);
  });

  it('should calculate SHORT liquidation price', () => {
    // SHORT: $100 entry, 2x leverage
    // Liquidation = 100 * (1 + 1/2) = 100 * 1.5 = $150
    const result = calculateLiquidationPrice(100, 2, 'short');
    expect(result).toBeCloseTo(150, 2);
  });

  it('should calculate high leverage LONG liquidation', () => {
    // LONG: $102,500 entry, 7x leverage
    // Liquidation = 102,500 * (1 - 1/7) = 102,500 * 0.8571 ≈ $87,857.14
    const result = calculateLiquidationPrice(102500, 7, 'long');
    expect(result).toBeCloseTo(87857.14, 0);
  });

  it('should calculate high leverage SHORT liquidation', () => {
    // SHORT: $102,500 entry, 7x leverage
    // Liquidation = 102,500 * (1 + 1/7) = 102,500 * 1.1429 ≈ $117,142.86
    const result = calculateLiquidationPrice(102500, 7, 'short');
    expect(result).toBeCloseTo(117142.86, 0);
  });

  it('should handle very high leverage', () => {
    // LONG: $50,000 entry, 50x leverage
    // Liquidation = 50,000 * (1 - 1/50) = 50,000 * 0.98 = $49,000
    const result = calculateLiquidationPrice(50000, 50, 'long');
    expect(result).toBeCloseTo(49000, 2);
  });
});

describe('calculateAdjustedPosition - User Test Cases', () => {
  it('should match verified user test case - original SHORT position', () => {
    // Original SHORT: $1500 at $102,500, SL $104,500, 7x leverage
    // Expected: Risk $204.88, Reward $1,237.98, RR 1:6.04
    const position = {
      symbol: 'BTC',
      sideEntry: 'short' as const,
      entryPrice: 102500,
      positionSize: 1500,
      leverage: 7,
      stopLoss: 104500,
      takeProfit: 90415,
      currentPrice: undefined,
      timestamp: new Date(),
    };

    const adjustment = {
      type: 'add' as const,
      newEntryPrice: 102500,
      adjustmentSize: 0, // No adjustment, just calculate original
    };

    // We're testing the original position risk/reward without adjustment
    const riskAmount = calculateRiskAmount(102500, 104500, 1500, 7, 'short');
    const rewardAmount = calculateRewardAmount(102500, 90415, 1500, 7, 'short');
    const riskRewardRatio = calculateRiskRewardRatio(riskAmount, rewardAmount);

    expect(riskAmount).toBeCloseTo(204.88, 1);
    expect(rewardAmount).toBeCloseTo(1237.98, 0);
    expect(riskRewardRatio).toBeCloseTo(6.04, 1);
  });

  it('should match verified user test case - after adjustment', () => {
    // After adding $1500 at $96,000
    // Expected: Avg entry $99,250, Risk $1,110.83, RR 1:1.68
    const newEntryPrice = calculateAverageEntryPrice(1500, 102500, 1500, 96000, 'add');
    expect(newEntryPrice).toBeCloseTo(99250, 0);

    const newTotalSize = 1500 + 1500; // $3000
    const riskAmount = calculateRiskAmount(99250, 104500, 3000, 7, 'short');
    const rewardAmount = calculateRewardAmount(99250, 90415, 3000, 7, 'short');
    const riskRewardRatio = calculateRiskRewardRatio(riskAmount, rewardAmount);

    expect(riskAmount).toBeCloseTo(1110.83, 1);
    expect(rewardAmount).toBeCloseTo(1865.58, 0);
    expect(riskRewardRatio).toBeCloseTo(1.68, 1);
  });

  it('should calculate position with full adjustment flow', () => {
    const position = {
      symbol: 'BTC',
      sideEntry: 'short' as const,
      entryPrice: 102500,
      positionSize: 1500,
      leverage: 7,
      stopLoss: 104500,
      takeProfit: 90415,
      currentPrice: 101000,
      timestamp: new Date(),
    };

    const adjustment = {
      type: 'add' as const,
      newEntryPrice: 96000,
      adjustmentSize: 1500,
    };

    const result = calculateAdjustedPosition(position, adjustment);

    expect(result.averageEntryPrice).toBeCloseTo(99250, 0);
    expect(result.totalSize).toBeCloseTo(3000, 0);
    expect(result.riskAmount).toBeCloseTo(1110.83, 1);
    expect(result.riskRewardRatio).toBeGreaterThan(1);
  });
});

describe('Edge Cases and Error Conditions', () => {
  it('should handle very small leverage (1.1x)', () => {
    const result = calculateRiskAmount(100, 95, 1000, 1.1, 'long');
    const notionalSize = 1000 * 1.1;
    const expectedRisk = notionalSize * (5 / 100);
    expect(result).toBeCloseTo(expectedRisk, 2);
  });

  it('should handle maximum leverage (50x)', () => {
    const result = calculateRiskAmount(100, 99, 1000, 50, 'long');
    const notionalSize = 1000 * 50;
    const expectedRisk = notionalSize * (1 / 100);
    expect(result).toBeCloseTo(expectedRisk, 2);
  });

  it('should handle very small position sizes', () => {
    const result = calculateAverageEntryPrice(10, 100, 10, 110, 'add');
    expect(result).toBeCloseTo(105, 2);
  });

  it('should handle very large position sizes', () => {
    const result = calculateAverageEntryPrice(1000000, 100, 1000000, 110, 'add');
    expect(result).toBeCloseTo(105, 2);
  });

  it('should handle close entry and stop loss prices', () => {
    const result = calculateRiskAmount(100, 99.5, 1000, 2, 'long');
    const notionalSize = 1000 * 2;
    const expectedRisk = notionalSize * (0.5 / 100);
    expect(result).toBeCloseTo(expectedRisk, 2);
  });

  it('should handle crypto prices at different scales', () => {
    // High price (BTC)
    const result1 = calculateLiquidationPrice(60000, 10, 'long');
    expect(result1).toBeCloseTo(60000 * 0.9, 0);

    // Low price (Altcoin)
    const result2 = calculateLiquidationPrice(0.0001, 5, 'long');
    expect(result2).toBeCloseTo(0.0001 * 0.8, 6);
  });
});
