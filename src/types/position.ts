export interface PositionEntry {
  entryPrice: number;
  size: number; // in USD
  leverage: number;
  timestamp: Date;
  type: 'initial' | 'add' | 'subtract'; // Track type of entry
}

export interface Position {
  id: string; // Unique identifier for saving/loading
  name: string; // Auto-generated name (e.g., "BTC LONG @ $45,234.50")
  customName?: string; // User-provided custom name for the position
  symbol: string;
  sideEntry: 'long' | 'short';
  entries: PositionEntry[]; // Track all entries in the chain
  stopLoss?: number;
  takeProfit?: number;
  currentPrice?: number;
  timestamp: Date; // Original position creation time
  savedAt: Date; // When the position was saved to storage
}

export interface PositionAdjustment {
  type: 'add' | 'subtract';
  newEntryPrice: number;
  adjustmentSize: number; // in USD
  adjustmentLeverage: number; // NEW: leverage for this specific adjustment
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
