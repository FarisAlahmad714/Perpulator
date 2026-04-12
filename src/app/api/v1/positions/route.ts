import { validateApiKey, extractBearerToken, logApiRequest } from '@/lib/apiKey';
import { db } from '@/lib/db';
import { positions } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { Position } from '@/types/position';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function GET(req: Request) {
  const headers = corsHeaders();

  const rawKey = extractBearerToken(req);
  if (!rawKey) {
    return Response.json(
      { error: 'Missing API key. Set Authorization: Bearer perp_...' },
      { status: 401, headers }
    );
  }

  let result: Awaited<ReturnType<typeof validateApiKey>>;
  try {
    result = await validateApiKey(rawKey);
  } catch {
    return Response.json({ error: 'Service temporarily unavailable' }, { status: 503, headers });
  }

  if (result === null) {
    return Response.json({ error: 'Invalid or expired API key' }, { status: 401, headers });
  }
  if (result === 'rate_limited') {
    return Response.json(
      { error: 'Rate limit exceeded. Max 100 requests per hour per key.' },
      { status: 429, headers }
    );
  }

  const { userId, keyId } = result;

  const rows = await db.select().from(positions).where(eq(positions.userId, userId));

  const data = rows.map((row) => {
    const pos = row.data as Position;
    return {
      ...pos,
      timestamp: new Date(pos.timestamp),
      savedAt: new Date(pos.savedAt),
    };
  });

  logApiRequest(keyId, userId, '/api/v1/positions', 200);
  return Response.json(data, { headers });
}

// ── POST /api/v1/positions — save a position ──────────────────────────────────
interface SavePositionRequest {
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  positionSize: number; // margin in USD
  leverage: number;
  stopLoss?: number;
  takeProfit?: number;
  name?: string;
}

export async function POST(req: Request) {
  const headers = corsHeaders();

  const rawKey = extractBearerToken(req);
  if (!rawKey) {
    return Response.json(
      { error: 'Missing API key. Set Authorization: Bearer perp_...' },
      { status: 401, headers }
    );
  }

  let result: Awaited<ReturnType<typeof validateApiKey>>;
  try {
    result = await validateApiKey(rawKey);
  } catch {
    return Response.json({ error: 'Service temporarily unavailable' }, { status: 503, headers });
  }

  if (result === null) return Response.json({ error: 'Invalid or expired API key' }, { status: 401, headers });
  if (result === 'rate_limited') {
    return Response.json({ error: 'Rate limit exceeded. Max 100 requests per hour per key.' }, { status: 429, headers });
  }

  const { userId, keyId } = result;

  let body: SavePositionRequest;
  try {
    body = await req.json();
  } catch {
    logApiRequest(keyId, userId, '/api/v1/positions', 400);
    return Response.json({ error: 'Invalid JSON body' }, { status: 400, headers });
  }

  const { symbol, side, entryPrice, positionSize, leverage, stopLoss, takeProfit, name } = body;

  const errors: string[] = [];
  if (!symbol || typeof symbol !== 'string') errors.push('symbol is required');
  if (side !== 'long' && side !== 'short') errors.push('side must be "long" or "short"');
  if (typeof entryPrice !== 'number' || entryPrice <= 0) errors.push('entryPrice must be a positive number');
  if (typeof positionSize !== 'number' || positionSize <= 0) errors.push('positionSize must be a positive number');
  if (typeof leverage !== 'number' || leverage < 1 || leverage > 125) errors.push('leverage must be between 1 and 125');

  if (errors.length > 0) {
    logApiRequest(keyId, userId, '/api/v1/positions', 422);
    return Response.json({ error: 'Validation failed', details: errors }, { status: 422, headers });
  }

  const id = crypto.randomUUID();
  const now = new Date();
  const sym = symbol.toUpperCase();
  const positionName = name?.trim() || `${sym} ${side.toUpperCase()} @ $${entryPrice.toLocaleString()}`;

  const positionData: Position = {
    id,
    name: positionName,
    symbol: sym,
    sideEntry: side,
    entries: [{ entryPrice, size: positionSize, leverage, timestamp: now, type: 'initial', stopLoss, takeProfit }],
    stopLoss,
    takeProfit,
    timestamp: now,
    savedAt: now,
  };

  await db.insert(positions).values({ id, userId, data: positionData, savedAt: now, updatedAt: now });

  logApiRequest(keyId, userId, '/api/v1/positions', 201);
  return Response.json(positionData, { status: 201, headers });
}
