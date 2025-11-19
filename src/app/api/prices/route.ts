import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory cache
interface CacheEntry {
  data: any;
  timestamp: number;
}

const priceCache: Map<string, CacheEntry> = new Map();
const CACHE_DURATION = 30000; // 30 seconds cache

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get('symbols')?.split(',') || [];

  if (!symbols.length) {
    return NextResponse.json({ error: 'No symbols provided' }, { status: 400 });
  }

  try {
    const cacheKey = symbols.sort().join(',');
    const now = Date.now();

    // Check cache
    const cached = priceCache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data);
    }

    // Map symbols to CoinGecko IDs
    const symbolToGeckoId: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'BNB': 'binancecoin',
      'XRP': 'ripple',
      'ADA': 'cardano',
      'SOL': 'solana',
      'DOGE': 'dogecoin',
      'AVAX': 'avalanche-2',
      'MATIC': 'matic-network',
      'LINK': 'chainlink',
      'UNI': 'uniswap',
      'XLM': 'stellar',
      'ATOM': 'cosmos',
      'APE': 'apecoin',
      'SHIB': 'shiba-inu',
      'FTM': 'fantom',
      'NEAR': 'near',
      'SAND': 'the-sandbox',
      'MANA': 'decentraland',
      'GALA': 'gala',
    };

    const geckoIds = symbols
      .map((s) => symbolToGeckoId[s.toUpperCase()] || s.toLowerCase())
      .filter(Boolean);

    if (!geckoIds.length) {
      return NextResponse.json({ error: 'No valid symbols' }, { status: 400 });
    }

    // Fetch from CoinGecko using native fetch
    const queryParams = new URLSearchParams({
      ids: geckoIds.join(','),
      vs_currencies: 'usd',
      include_market_cap: 'true',
      include_24hr_vol: 'true',
      include_24hr_change: 'true',
    });

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?${queryParams}`,
      {
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      console.error(`CoinGecko API error: ${response.status} ${response.statusText}`);

      // Fallback: return cached data if API fails (important for rate limiting)
      const cached = priceCache.get(cacheKey);
      if (cached) {
        console.log('API failed, returning cached prices');
        return NextResponse.json(cached.data);
      }

      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Format response
    const result: Record<string, any> = {};
    symbols.forEach((symbol) => {
      const geckoId = symbolToGeckoId[symbol.toUpperCase()] || symbol.toLowerCase();
      const priceData = data[geckoId];

      if (priceData) {
        result[symbol.toUpperCase()] = {
          price: priceData.usd,
          change24h: priceData.usd_24h_change || 0,
          marketCap: priceData.usd_market_cap || 0,
          volume24h: priceData.usd_24h_vol || 0,
        };
      }
    });

    // Cache the result
    priceCache.set(cacheKey, {
      data: result,
      timestamp: now,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Price fetch error:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch prices from CoinGecko', details: error.message },
      { status: 500 }
    );
  }
}
