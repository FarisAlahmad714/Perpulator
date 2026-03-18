import axios from 'axios';

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

// Mapping of common symbols to CoinGecko IDs
const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  // Large caps
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'BNB': 'binancecoin',
  'XRP': 'ripple',
  'SOL': 'solana',
  'TRX': 'tron',
  'TON': 'the-open-network',
  'ADA': 'cardano',
  'AVAX': 'avalanche-2',
  'DOGE': 'dogecoin',
  'DOT': 'polkadot',
  'LTC': 'litecoin',
  'BCH': 'bitcoin-cash',
  'SHIB': 'shiba-inu',
  // L2s / alt L1s
  'SUI': 'sui',
  'APT': 'aptos',
  'OP': 'optimism',
  'ARB': 'arbitrum',
  'SEI': 'sei-network',
  'INJ': 'injective-protocol',
  'TIA': 'celestia',
  'NEAR': 'near',
  'ATOM': 'cosmos',
  'HBAR': 'hedera-hashgraph',
  'ICP': 'internet-computer',
  'POL': 'matic-network',
  // DeFi
  'AAVE': 'aave',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'JUP': 'jupiter-exchange-solana',
  // Memes
  'PEPE': 'pepe',
  'WIF': 'dogwifcoin',
  'BONK': 'bonk',
  'NOT': 'notcoin',
  // AI / infra
  'TAO': 'bittensor',
  'FET': 'fetch-ai',
  'RENDER': 'render-token',
  'WLD': 'worldcoin-wld',
  'PYTH': 'pyth-network',
  // Other liquid
  'XLM': 'stellar',
  'LDO': 'lido-dao',
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
