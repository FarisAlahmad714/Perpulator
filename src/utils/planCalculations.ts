export interface PlanInput {
  capital: number;
  riskPct: number;
  targetProfit: number;
  timeframeDays: number;
  volatility24h: number;
}

export interface PlanTier {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  rrRatio: number;
  winRate: number;
  riskPerTrade: number;
  rewardPerTrade: number;
  evPerTrade: number;
  tradesNeeded: number;
  tradesPerDay: number;
  suggestedLeverage: string;
  rawLeverage: number;
  realism: 'green' | 'yellow' | 'red';
  realismLabel: string;
  accentColor: string;
  isViable: boolean;
  leverageCategory: 'low' | 'high';
}

interface TierConfig {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  rrRatio: number;
  winRate: number;
  stopPctOfVol: number;
  accentColor: string;
  leverageCategory: 'low' | 'high';
}

// Low-leverage tiers use wide stops (2–3× daily range) → patient, swing-style trading → 2–10x leverage
// High-leverage tiers use tight stops (fraction of daily range) → active intraday trading → 15–50x leverage
const TIER_CONFIGS: TierConfig[] = [
  {
    id: 'swing',
    title: 'Patient Swing',
    subtitle: 'Wide stops. Multi-day holds. Low leverage.',
    icon: '🌊',
    rrRatio: 2,
    winRate: 0.48,
    stopPctOfVol: 3.0,
    accentColor: '#818CF8',
    leverageCategory: 'low',
  },
  {
    id: 'position',
    title: 'Position Trade',
    subtitle: 'Moderate stops. Swing to multi-day.',
    icon: '⚓',
    rrRatio: 2.5,
    winRate: 0.44,
    stopPctOfVol: 1.5,
    accentColor: '#34D399',
    leverageCategory: 'low',
  },
  {
    id: 'grind',
    title: 'Slow Grind',
    subtitle: 'Tight stops. High accuracy required.',
    icon: '🌱',
    rrRatio: 1.5,
    winRate: 0.58,
    stopPctOfVol: 0.5,
    accentColor: '#00D9FF',
    leverageCategory: 'high',
  },
  {
    id: 'balanced',
    title: 'Balanced',
    subtitle: 'Standard intraday R:R.',
    icon: '⚖️',
    rrRatio: 2,
    winRate: 0.50,
    stopPctOfVol: 0.35,
    accentColor: '#10B981',
    leverageCategory: 'high',
  },
  {
    id: 'conviction',
    title: 'High Conviction',
    subtitle: 'Fewer trades. Bigger targets.',
    icon: '🎯',
    rrRatio: 3,
    winRate: 0.40,
    stopPctOfVol: 0.20,
    accentColor: '#F59E0B',
    leverageCategory: 'high',
  },
  {
    id: 'moonshot',
    title: 'Moonshot',
    subtitle: 'Low win rate needed. High leverage.',
    icon: '🚀',
    rrRatio: 5,
    winRate: 0.30,
    stopPctOfVol: 0.10,
    accentColor: '#FF6B6B',
    leverageCategory: 'high',
  },
];

export function generatePlanTiers(input: PlanInput): PlanTier[] {
  const { capital, riskPct, targetProfit, timeframeDays, volatility24h } = input;
  const riskPerTrade = capital * (riskPct / 100);
  const absVol = Math.max(Math.abs(volatility24h), 1);

  return TIER_CONFIGS.map((config) => {
    const { rrRatio, winRate, stopPctOfVol, accentColor, leverageCategory } = config;
    const rewardPerTrade = riskPerTrade * rrRatio;
    const evPerTrade = winRate * rewardPerTrade - (1 - winRate) * riskPerTrade;
    const isViable = evPerTrade > 0;

    const tradesNeeded = isViable ? Math.ceil(targetProfit / evPerTrade) : 0;
    const tradesPerDay =
      isViable && timeframeDays > 0 ? tradesNeeded / timeframeDays : 0;

    const stopPct = Math.max(absVol * stopPctOfVol, 0.3);
    const rawLeverage = Math.min(Math.max(riskPct / stopPct, 1), 50);
    const suggestedLeverage = formatLeverageRange(rawLeverage);

    const { realism, realismLabel } = assessRealism(winRate, tradesPerDay, rawLeverage);

    return {
      id: config.id,
      title: config.title,
      subtitle: config.subtitle,
      icon: config.icon,
      rrRatio,
      winRate,
      riskPerTrade,
      rewardPerTrade,
      evPerTrade,
      tradesNeeded,
      tradesPerDay,
      suggestedLeverage,
      rawLeverage,
      realism,
      realismLabel,
      accentColor,
      isViable,
      leverageCategory,
    };
  });
}

function formatLeverageRange(leverage: number): string {
  const low = Math.max(1, Math.floor(leverage * 0.8));
  const high = Math.min(50, Math.ceil(leverage * 1.2));
  if (low === high) return `${low}x`;
  return `${low}x – ${high}x`;
}

function assessRealism(
  winRate: number,
  tradesPerDay: number,
  leverage: number
): { realism: 'green' | 'yellow' | 'red'; realismLabel: string } {
  // Red: genuinely extreme — very hard to sustain
  if (winRate > 0.68 || tradesPerDay > 5 || leverage > 40) {
    return { realism: 'red', realismLabel: 'Very Difficult' };
  }
  // Yellow: elevated but achievable for experienced traders
  if (winRate > 0.55 || tradesPerDay > 2 || leverage > 18) {
    return { realism: 'yellow', realismLabel: 'Challenging' };
  }
  // Green: reasonable for most traders
  return { realism: 'green', realismLabel: 'Achievable' };
}

export function formatTimeframe(days: number): string {
  if (days === 1) return '1 day';
  if (days < 14) return `${days} days`;
  if (days < 60) return `${Math.round(days / 7)} weeks`;
  return `${Math.round(days / 30)} months`;
}
