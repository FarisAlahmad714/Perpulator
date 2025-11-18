'use client';

import { useState, useEffect } from 'react';
import { Position } from '@/types/position';
import { getSupportedCryptos } from '@/lib/cryptoApi';
import { usePrice } from '@/contexts/PriceContext';
import { AlertCircle, TrendingUp } from 'lucide-react';

interface PositionFormProps {
  onSubmit: (position: Position) => void;
}

export default function PositionForm({ onSubmit }: PositionFormProps) {
  const [symbol, setSymbol] = useState('BTC');
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [entryPrice, setEntryPrice] = useState('');
  const [positionSizeUSD, setPositionSizeUSD] = useState('');
  const [positionSizeCoins, setPositionSizeCoins] = useState('');
  const [leverage, setLeverage] = useState('1');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [error, setError] = useState('');
  const [useCoinsInput, setUseCoinsInput] = useState(false);

  // Get live price from context
  const livePrice = usePrice(symbol);
  const supportedCryptos = getSupportedCryptos();

  // Convert between USD and coins
  useEffect(() => {
    if (livePrice?.price) {
      if (useCoinsInput && positionSizeCoins) {
        const usdValue = (parseFloat(positionSizeCoins) * livePrice.price).toFixed(2);
        setPositionSizeUSD(usdValue);
      } else if (!useCoinsInput && positionSizeUSD) {
        const coins = (parseFloat(positionSizeUSD) / livePrice.price).toFixed(6);
        setPositionSizeCoins(coins);
      }
    }
  }, [positionSizeUSD, positionSizeCoins, useCoinsInput, livePrice?.price]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!entryPrice || !positionSizeUSD) {
      setError('Please fill in all required fields');
      return;
    }

    const position: Position = {
      symbol: symbol.toUpperCase(),
      sideEntry: direction,
      entryPrice: parseFloat(entryPrice),
      positionSize: parseFloat(positionSizeUSD),
      leverage: parseFloat(leverage),
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      currentPrice: livePrice?.price,
      timestamp: new Date(),
    };

    onSubmit(position);
  };

  return (
    <form onSubmit={handleSubmit} className="card-bg p-8 space-y-6">
      <h2 className="text-2xl font-bold mb-6">Enter Your Position</h2>

      {error && (
        <div className="flex items-center gap-2 bg-red-900/20 border border-red-500 rounded-lg p-4">
          <AlertCircle size={20} className="text-red-500" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {/* Symbol Selection */}
      <div>
        <label className="block text-sm font-semibold mb-2">Cryptocurrency</label>
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="input-field w-full"
        >
          {supportedCryptos.map((crypto) => (
            <option key={crypto} value={crypto}>
              {crypto}
            </option>
          ))}
        </select>
      </div>

      {/* Current Price Display */}
      {livePrice?.price && (
        <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Current Price</span>
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-400" />
              <span className="text-xl font-bold text-blue-400">
                ${livePrice.price.toFixed(2)}
              </span>
            </div>
          </div>
          {livePrice.change24h !== 0 && (
            <div className={`text-xs mt-2 ${livePrice.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              24h: {livePrice.change24h.toFixed(2)}%
            </div>
          )}
        </div>
      )}

      {/* Direction */}
      <div>
        <label className="block text-sm font-semibold mb-2">Position Direction</label>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setDirection('long')}
            className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
              direction === 'long'
                ? 'bg-profit text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Long
          </button>
          <button
            type="button"
            onClick={() => setDirection('short')}
            className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
              direction === 'short'
                ? 'bg-loss text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Short
          </button>
        </div>
      </div>

      {/* Entry Price */}
      <div>
        <label className="block text-sm font-semibold mb-2">Entry Price (USD)</label>
        <input
          type="number"
          step="0.00000001"
          value={entryPrice}
          onChange={(e) => setEntryPrice(e.target.value)}
          placeholder="e.g., 45000"
          className="input-field w-full"
        />
      </div>

      {/* Position Size */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-semibold">Position Size</label>
          <button
            type="button"
            onClick={() => setUseCoinsInput(!useCoinsInput)}
            className="text-xs text-gray-400 hover:text-gray-300 underline"
          >
            Switch to {useCoinsInput ? 'USD' : 'Coins'}
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            step="0.00000001"
            value={useCoinsInput ? positionSizeCoins : positionSizeUSD}
            onChange={(e) =>
              useCoinsInput
                ? setPositionSizeCoins(e.target.value)
                : setPositionSizeUSD(e.target.value)
            }
            placeholder={useCoinsInput ? 'e.g., 0.5 BTC' : 'e.g., 5000'}
            className="input-field flex-1"
          />
          <div className="bg-gray-700 px-4 py-2 rounded-lg flex items-center text-sm font-semibold text-gray-300">
            {useCoinsInput ? symbol : 'USD'}
          </div>
        </div>
        {livePrice?.price && (
          <p className="text-xs text-gray-500 mt-2">
            = {useCoinsInput ? (parseFloat(positionSizeCoins || '0') * livePrice.price).toFixed(2) : (parseFloat(positionSizeUSD || '0') / livePrice.price).toFixed(6)}{' '}
            {useCoinsInput ? 'USD' : symbol}
          </p>
        )}
      </div>

      {/* Leverage */}
      <div>
        <label className="block text-sm font-semibold mb-2">Leverage (1x - 50x)</label>
        <input
          type="number"
          min="1"
          max="50"
          step="0.1"
          value={leverage}
          onChange={(e) => setLeverage(e.target.value)}
          placeholder="e.g., 5"
          className="input-field w-full"
        />
      </div>

      {/* Stop Loss */}
      <div>
        <label className="block text-sm font-semibold mb-2">Stop Loss (Optional)</label>
        <input
          type="number"
          step="0.00000001"
          value={stopLoss}
          onChange={(e) => setStopLoss(e.target.value)}
          placeholder={direction === 'long' ? 'Below entry price' : 'Above entry price'}
          className="input-field w-full"
        />
      </div>

      {/* Take Profit */}
      <div>
        <label className="block text-sm font-semibold mb-2">Take Profit (Optional)</label>
        <input
          type="number"
          step="0.00000001"
          value={takeProfit}
          onChange={(e) => setTakeProfit(e.target.value)}
          placeholder={direction === 'long' ? 'Above entry price' : 'Below entry price'}
          className="input-field w-full"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="btn-primary w-full py-3 text-lg font-bold"
      >
        Calculate Position
      </button>
    </form>
  );
}
