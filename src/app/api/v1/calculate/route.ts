import { validateApiKey, extractBearerToken, logApiRequest, extractRequestMeta } from '@/lib/apiKey';
import {
  calculateRiskAmount,
  calculateRewardAmount,
  calculateRiskRewardRatio,
  calculatePNL,
  calculateLiquidationPrice,
} from '@/utils/calculations';

interface CalculateRequest {
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  positionSize: number; // margin in USD
  leverage: number;
  stopLoss?: number;
  takeProfit?: number;
  currentPrice?: number;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: Request) {
  const headers = corsHeaders();

  // ── Auth ────────────────────────────────────────────────────────────────────
  const rawKey = extractBearerToken(req);
  if (!rawKey) {
    return Response.json(
      { error: 'Missing API key. Set Authorization: Bearer perp_...' },
      { status: 401, headers }
    );
  }

  let authResult: Awaited<ReturnType<typeof validateApiKey>>;
  try {
    authResult = await validateApiKey(rawKey);
  } catch {
    return Response.json({ error: 'Service temporarily unavailable' }, { status: 503, headers });
  }

  if (authResult === null) {
    return Response.json({ error: 'Invalid or expired API key' }, { status: 401, headers });
  }
  if (authResult === 'rate_limited') {
    return Response.json(
      { error: 'Rate limit exceeded. Max 100 requests per hour per key.' },
      { status: 429, headers }
    );
  }

  const { userId, keyId } = authResult;
  const meta = extractRequestMeta(req);

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: CalculateRequest;
  try {
    body = await req.json();
  } catch {
    logApiRequest(keyId, userId, '/api/v1/calculate', 400, meta);
    return Response.json({ error: 'Invalid JSON body' }, { status: 400, headers });
  }

  const { symbol, side, entryPrice, positionSize, leverage, stopLoss, takeProfit, currentPrice } =
    body;

  // ── Validate required fields ─────────────────────────────────────────────────
  const errors: string[] = [];

  if (!symbol || typeof symbol !== 'string') errors.push('symbol is required (e.g. "BTC")');
  if (side !== 'long' && side !== 'short') errors.push('side must be "long" or "short"');
  if (typeof entryPrice !== 'number' || entryPrice <= 0) errors.push('entryPrice must be a positive number');
  if (typeof positionSize !== 'number' || positionSize <= 0) errors.push('positionSize (margin in USD) must be a positive number');
  if (typeof leverage !== 'number' || leverage < 1 || leverage > 125) errors.push('leverage must be between 1 and 125');
  if (stopLoss !== undefined && (typeof stopLoss !== 'number' || stopLoss <= 0)) errors.push('stopLoss must be a positive number');
  if (takeProfit !== undefined && (typeof takeProfit !== 'number' || takeProfit <= 0)) errors.push('takeProfit must be a positive number');
  if (currentPrice !== undefined && (typeof currentPrice !== 'number' || currentPrice <= 0)) errors.push('currentPrice must be a positive number');

  if (errors.length > 0) {
    logApiRequest(keyId, userId, '/api/v1/calculate', 422, meta);
    return Response.json({ error: 'Validation failed', details: errors }, { status: 422, headers });
  }

  // ── Directional SL/TP sanity checks ─────────────────────────────────────────
  if (stopLoss !== undefined) {
    if (side === 'long' && stopLoss >= entryPrice) {
      logApiRequest(keyId, userId, '/api/v1/calculate', 422, meta);
      return Response.json(
        { error: 'For a LONG position, stopLoss must be below entryPrice' },
        { status: 422, headers }
      );
    }
    if (side === 'short' && stopLoss <= entryPrice) {
      logApiRequest(keyId, userId, '/api/v1/calculate', 422, meta);
      return Response.json(
        { error: 'For a SHORT position, stopLoss must be above entryPrice' },
        { status: 422, headers }
      );
    }
  }
  if (takeProfit !== undefined) {
    if (side === 'long' && takeProfit <= entryPrice) {
      logApiRequest(keyId, userId, '/api/v1/calculate', 422, meta);
      return Response.json(
        { error: 'For a LONG position, takeProfit must be above entryPrice' },
        { status: 422, headers }
      );
    }
    if (side === 'short' && takeProfit >= entryPrice) {
      logApiRequest(keyId, userId, '/api/v1/calculate', 422, meta);
      return Response.json(
        { error: 'For a SHORT position, takeProfit must be below entryPrice' },
        { status: 422, headers }
      );
    }
  }

  // ── Calculations ─────────────────────────────────────────────────────────────
  const notionalSize = positionSize * leverage;
  const riskAmount = calculateRiskAmount(entryPrice, stopLoss, positionSize, leverage, side);
  const rewardAmount =
    takeProfit !== undefined
      ? calculateRewardAmount(entryPrice, takeProfit, positionSize, leverage, side)
      : 0;
  const riskRewardRatio = calculateRiskRewardRatio(riskAmount, rewardAmount);
  const liquidationPrice = calculateLiquidationPrice(entryPrice, leverage, side);

  let pnl: number | null = null;
  let pnlPercentage: number | null = null;
  if (currentPrice !== undefined) {
    const result = calculatePNL(entryPrice, currentPrice, positionSize, leverage, side);
    pnl = result.pnl;
    pnlPercentage = result.pnlPercentage;
  }

  logApiRequest(keyId, userId, '/api/v1/calculate', 200, meta);
  return Response.json(
    {
      symbol: symbol.toUpperCase(),
      side,
      entryPrice,
      positionSize,
      leverage,
      notionalSize,
      liquidationPrice: leverage > 1 ? liquidationPrice : null,
      stopLoss: stopLoss ?? null,
      takeProfit: takeProfit ?? null,
      riskAmount: riskAmount > 0 ? riskAmount : null,
      rewardAmount: rewardAmount > 0 ? rewardAmount : null,
      riskRewardRatio: riskRewardRatio > 0 ? riskRewardRatio : null,
      currentPrice: currentPrice ?? null,
      pnl,
      pnlPercentage,
    },
    { status: 200, headers }
  );
}
