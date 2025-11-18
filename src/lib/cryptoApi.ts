import axios from 'axios';

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

// Mapping of common symbols to CoinGecko IDs
const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
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

export interface CryptoPrice {
  symbol: string;
  price: number;
  change24h: number;
  change7d: number;
  marketCap: number;
  volume24h: number;
}

/**
 * Get current price of a cryptocurrency
 */
export const getCryptoPrice = async (symbol: string): Promise<CryptoPrice | null> => {
  try {
    const coingeckoId = SYMBOL_TO_COINGECKO_ID[symbol.toUpperCase()] || symbol.toLowerCase();

    const response = await axios.get(`${COINGECKO_API_URL}/simple/price`, {
      params: {
        ids: coingeckoId,
        vs_currencies: 'usd',
        include_market_cap: true,
        include_24hr_vol: true,
        include_24hr_change: true,
        include_7d_change: true,
      },
    });

    const data = response.data[coingeckoId];

    if (!data) {
      return null;
    }

    return {
      symbol: symbol.toUpperCase(),
      price: data.usd,
      change24h: data.usd_24h_change || 0,
      change7d: data.usd_7d_change || 0,
      marketCap: data.usd_market_cap || 0,
      volume24h: data.usd_24h_vol || 0,
    };
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
};

/**
 * Get prices for multiple cryptocurrencies
 */
export const getCryptoPrices = async (symbols: string[]): Promise<CryptoPrice[]> => {
  try {
    const ids = symbols
      .map((s) => SYMBOL_TO_COINGECKO_ID[s.toUpperCase()] || s.toLowerCase())
      .join(',');

    const response = await axios.get(`${COINGECKO_API_URL}/simple/price`, {
      params: {
        ids: ids,
        vs_currencies: 'usd',
        include_market_cap: true,
        include_24hr_vol: true,
        include_24hr_change: true,
      },
    });

    const prices: CryptoPrice[] = [];

    symbols.forEach((symbol) => {
      const coingeckoId = SYMBOL_TO_COINGECKO_ID[symbol.toUpperCase()] || symbol.toLowerCase();
      const data = response.data[coingeckoId];

      if (data) {
        prices.push({
          symbol: symbol.toUpperCase(),
          price: data.usd,
          change24h: data.usd_24h_change || 0,
          change7d: data.usd_7d_change || 0,
          marketCap: data.usd_market_cap || 0,
          volume24h: data.usd_24h_vol || 0,
        });
      }
    });

    return prices;
  } catch (error) {
    console.error('Error fetching prices:', error);
    return [];
  }
};

/**
 * Get list of supported cryptocurrencies
 */
export const getSupportedCryptos = (): string[] => {
  return Object.keys(SYMBOL_TO_COINGECKO_ID);
};
