'use client';

import { useState, useEffect } from 'react';
import { Position } from '@/types/position';
import { getSupportedCryptos } from '@/lib/cryptoApi';
import { usePrice } from '@/contexts/PriceContext';
import { validatePositionInput, getErrorMessage, ValidationError } from '@/utils/validation';
import { trackPositionCalculated } from '@/lib/analytics';
import { ArrowRight } from 'lucide-react';

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
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [useCoinsInput, setUseCoinsInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setValidationErrors([]);

    const errors = validatePositionInput(
      entryPrice,
      positionSizeUSD,
      leverage,
      stopLoss,
      takeProfit
    );

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSubmitting(true);

    const now = new Date();
    const position: Position = {
      id: `${symbol.toUpperCase()}_${now.getTime()}`,
      name: `${symbol.toUpperCase()} ${direction.toUpperCase()} @ $${parseFloat(entryPrice).toFixed(2)}`,
      symbol: symbol.toUpperCase(),
      sideEntry: direction,
      entries: [
        {
          entryPrice: parseFloat(entryPrice),
          size: parseFloat(positionSizeUSD),
          leverage: parseFloat(leverage),
          timestamp: new Date(),
          type: 'initial',
        }
      ],
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      currentPrice: livePrice?.price,
      timestamp: new Date(),
      savedAt: now,
    };

    // Track analytics
    trackPositionCalculated(
      symbol.toUpperCase(),
      direction,
      parseFloat(leverage),
      parseFloat(positionSizeUSD)
    );

    // Simulate submit animation
    setTimeout(() => {
      onSubmit(position);
      setIsSubmitting(false);
    }, 300);
  };

  const hasError = (field: string) => !!getErrorMessage(validationErrors, field);

  return (
    <form onSubmit={handleSubmit} className="w-full py-8 sm:py-12">
      {/* Crypto Selector */}
      <div className="mb-16 sm:mb-20">
        <label className="text-label mb-6 block">Select Asset</label>
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="input-field text-2xl sm:text-3xl font-600"
        >
          {supportedCryptos.map((crypto) => (
            <option key={crypto} value={crypto}>
              {crypto}
            </option>
          ))}
        </select>
      </div>

      {/* Live Price Display */}
      {livePrice?.price && (
        <div className="mb-16 sm:mb-20 pb-12 border-b border-slate-700/50">
          <p className="text-label mb-2">Current Market Price</p>
          <p className="text-4xl sm:text-5xl font-700 text-neutral animate-fade-in-up">
            ${livePrice.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </p>
          {livePrice.change24h !== 0 && (
            <p className={`text-sm mt-4 ${livePrice.change24h >= 0 ? 'text-profit' : 'text-loss'}`}>
              24h: {livePrice.change24h.toFixed(2)}%
            </p>
          )}
        </div>
      )}

      {/* Entry Price */}
      <div className="mb-16 sm:mb-20">
        <label className="text-label mb-2 block">Entry Price</label>
        <input
          type="number"
          step="0.00000001"
          value={entryPrice}
          onChange={(e) => setEntryPrice(e.target.value)}
          placeholder="50,234.50"
          className={`input-field text-3xl sm:text-4xl font-600 text-metric ${
            hasError('entryPrice') ? 'border-loss' : ''
          }`}
        />
        {hasError('entryPrice') && (
          <p className="text-xs text-loss mt-3">{getErrorMessage(validationErrors, 'entryPrice')}</p>
        )}
      </div>

      {/* Position Size */}
      <div className="mb-16 sm:mb-20">
        <div className="flex items-center justify-between mb-2">
          <label className="text-label block">Position Size</label>
          <button
            type="button"
            onClick={() => setUseCoinsInput(!useCoinsInput)}
            className="text-xs text-neutral hover:text-cyan-300 transition-colors"
          >
            {useCoinsInput ? 'Switch to USD' : 'Switch to Coins'}
          </button>
        </div>
        <div className="flex items-baseline gap-4">
          <input
            type="number"
            step="0.00000001"
            value={useCoinsInput ? positionSizeCoins : positionSizeUSD}
            onChange={(e) =>
              useCoinsInput
                ? setPositionSizeCoins(e.target.value)
                : setPositionSizeUSD(e.target.value)
            }
            placeholder={useCoinsInput ? '1.5' : '1,500'}
            className={`input-field flex-1 text-3xl sm:text-4xl font-600 text-metric ${
              hasError('positionSize') ? 'border-loss' : ''
            }`}
          />
          <span className="text-label font-700 min-w-fit">
            {useCoinsInput ? symbol : 'USD'}
          </span>
        </div>
        {hasError('positionSize') && (
          <p className="text-xs text-loss mt-3">{getErrorMessage(validationErrors, 'positionSize')}</p>
        )}
      </div>

      {/* Leverage & Direction Grid */}
      <div className="grid grid-cols-2 gap-8 mb-16 sm:mb-20">
        {/* Leverage */}
        <div>
          <label className="text-label mb-2 block">Leverage</label>
          <input
            type="number"
            min="1"
            max="50"
            step="0.1"
            value={leverage}
            onChange={(e) => setLeverage(e.target.value)}
            placeholder="1"
            className={`input-field text-2xl sm:text-3xl font-600 text-metric ${
              hasError('leverage') ? 'border-loss' : ''
            }`}
          />
          {hasError('leverage') && (
            <p className="text-xs text-loss mt-3">{getErrorMessage(validationErrors, 'leverage')}</p>
          )}
        </div>

        {/* Direction */}
        <div>
          <label className="text-label mb-2 block">Direction</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDirection('long')}
              className={`flex-1 py-3 px-4 rounded-lg font-600 text-sm transition-all ${
                direction === 'long'
                  ? 'bg-profit/20 border border-profit text-profit'
                  : 'bg-gray-700/30 border border-gray-600/50 text-gray-400 hover:border-gray-500'
              }`}
            >
              Long
            </button>
            <button
              type="button"
              onClick={() => setDirection('short')}
              className={`flex-1 py-3 px-4 rounded-lg font-600 text-sm transition-all ${
                direction === 'short'
                  ? 'bg-loss/20 border border-loss text-loss'
                  : 'bg-gray-700/30 border border-gray-600/50 text-gray-400 hover:border-gray-500'
              }`}
            >
              Short
            </button>
          </div>
        </div>
      </div>

      {/* Stop Loss */}
      <div className="mb-16 sm:mb-20">
        <label className="text-label mb-2 block">Stop Loss (Optional)</label>
        <input
          type="number"
          step="0.00000001"
          value={stopLoss}
          onChange={(e) => setStopLoss(e.target.value)}
          placeholder={direction === 'long' ? 'Below entry price' : 'Above entry price'}
          className={`input-field text-2xl sm:text-3xl font-500 text-metric ${
            hasError('stopLoss') ? 'border-loss' : ''
          }`}
        />
        {hasError('stopLoss') && (
          <p className="text-xs text-loss mt-3">{getErrorMessage(validationErrors, 'stopLoss')}</p>
        )}
      </div>

      {/* Take Profit */}
      <div className="mb-16 sm:mb-20">
        <label className="text-label mb-2 block">Take Profit (Optional)</label>
        <input
          type="number"
          step="0.00000001"
          value={takeProfit}
          onChange={(e) => setTakeProfit(e.target.value)}
          placeholder={direction === 'long' ? 'Above entry price' : 'Below entry price'}
          className={`input-field text-2xl sm:text-3xl font-500 text-metric ${
            hasError('takeProfit') ? 'border-loss' : ''
          }`}
        />
        {hasError('takeProfit') && (
          <p className="text-xs text-loss mt-3">{getErrorMessage(validationErrors, 'takeProfit')}</p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={`btn-primary group w-full flex items-center justify-center gap-3 ${
          isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
        }`}
      >
        <span>{isSubmitting ? 'Calculating...' : 'Analyze Position'}</span>
        <ArrowRight
          size={20}
          className={`transition-transform ${isSubmitting ? 'translate-x-0' : 'group-hover:translate-x-1'}`}
        />
      </button>
    </form>
  );
}
