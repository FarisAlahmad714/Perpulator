import { validateApiKey, extractBearerToken, logApiRequest, extractRequestMeta } from '@/lib/apiKey';
import { generatePlanTiers, PlanInput } from '@/utils/planCalculations';

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
  const meta = extractRequestMeta(req);

  let body: PlanInput;
  try {
    body = await req.json();
  } catch {
    logApiRequest(keyId, userId, '/api/v1/plan', 400, meta);
    return Response.json({ error: 'Invalid JSON body' }, { status: 400, headers });
  }

  const { capital, riskPct, targetProfit, timeframeDays, volatility24h } = body;

  const errors: string[] = [];
  if (typeof capital !== 'number' || capital <= 0) errors.push('capital must be a positive number (account size in USD)');
  if (typeof riskPct !== 'number' || riskPct <= 0 || riskPct > 100) errors.push('riskPct must be between 0 and 100 (% of capital risked per trade)');
  if (typeof targetProfit !== 'number' || targetProfit <= 0) errors.push('targetProfit must be a positive number (profit goal in USD)');
  if (typeof timeframeDays !== 'number' || timeframeDays < 1) errors.push('timeframeDays must be at least 1');
  if (typeof volatility24h !== 'number' || volatility24h <= 0) errors.push('volatility24h must be a positive number (24h price change % of the asset)');

  if (errors.length > 0) {
    logApiRequest(keyId, userId, '/api/v1/plan', 422, meta);
    return Response.json({ error: 'Validation failed', details: errors }, { status: 422, headers });
  }

  const tiers = generatePlanTiers({ capital, riskPct, targetProfit, timeframeDays, volatility24h });

  // Strip UI-only fields (accentColor, icon) from the API response
  const cleaned = tiers.map(({ accentColor: _a, icon: _i, ...tier }) => tier);

  logApiRequest(keyId, userId, '/api/v1/plan', 200, meta);
  return Response.json({ input: body, tiers: cleaned }, { headers });
}
