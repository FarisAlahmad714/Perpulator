export interface Position {
  symbol: string;
  sideEntry: 'long' | 'short';
  entryPrice: number;
  positionSize: number; // in USD
  leverage: number; // 1x to 50x
  stopLoss?: number;
  takeProfit?: number;
  currentPrice?: number;
  timestamp: Date;
}

export interface PositionAdjustment {
  type: 'add' | 'subtract';
  newEntryPrice: number;
  adjustmentSize: number; // in USD
  takeProfit?: number; // Optional: user-specified take profit price
}

export interface CalculatedPosition {
  averageEntryPrice: number;
  totalSize: number;
  totalCapital: number;
  riskAmount: number;
  rewardAmount: number;
  riskRewardRatio: number;
  pnl?: number;
  pnlPercentage?: number;
  liquidationPrice?: number;
}
