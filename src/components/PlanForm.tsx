'use client';

import { useState } from 'react';
import { usePrice } from '@/contexts/PriceContext';
import { getSupportedCryptos } from '@/lib/cryptoApi';
import { ArrowRight } from 'lucide-react';

export interface PlanFormValues {
  symbol: string;
  capital: number;
  riskPct: number;
  targetProfit: number;
  timeframeDays: number;
  volatility24h: number;
}

interface PlanFormProps {
  onSubmit: (values: PlanFormValues) => void;
}

type TimeUnit = 'days' | 'weeks' | 'months';

export default function PlanForm({ onSubmit }: PlanFormProps) {
  const [symbol, setSymbol] = useState('BTC');
  const [capital, setCapital] = useState('');
  const [riskPct, setRiskPct] = useState('');
  const [targetProfit, setTargetProfit] = useState('');
  const [timeframeValue, setTimeframeValue] = useState('');
  const [timeUnit, setTimeUnit] = useState<TimeUnit>('days');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const livePrice = usePrice(symbol);
  const supportedCryptos = getSupportedCryptos();

  const validate = () => {
    const errs: Record<string, string> = {};
    const cap = parseFloat(capital);
    const risk = parseFloat(riskPct);
    const target = parseFloat(targetProfit);
    const tf = parseFloat(timeframeValue);

    if (!capital || cap <= 0) errs.capital = 'Enter a valid capital amount';
    if (!riskPct || risk <= 0 || risk > 100) errs.riskPct = 'Enter a % between 0.1 and 100';
    if (!targetProfit || target <= 0) errs.targetProfit = 'Enter a target profit amount';
    if (!timeframeValue || tf <= 0) errs.timeframe = 'Enter a valid timeframe';
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});

    const multipliers: Record<TimeUnit, number> = { days: 1, weeks: 7, months: 30 };
    const timeframeDays = parseFloat(timeframeValue) * multipliers[timeUnit];

    onSubmit({
      symbol,
      capital: parseFloat(capital),
      riskPct: parseFloat(riskPct),
      targetProfit: parseFloat(targetProfit),
      timeframeDays,
      volatility24h: livePrice?.change24h ?? 2,
    });
  };

  const capitalNum = parseFloat(capital) || 0;
  const riskNum = parseFloat(riskPct) || 0;
  const targetNum = parseFloat(targetProfit) || 0;
  const riskDollar = capitalNum * (riskNum / 100);
  const returnPct = capitalNum > 0 ? (targetNum / capitalNum) * 100 : 0;

  return (
    <form onSubmit={handleSubmit} className="w-full py-8 sm:py-12">
      {/* Asset */}
      <div className="mb-16 sm:mb-20">
        <label className="text-label mb-6 block">Select Asset</label>
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="input-field text-2xl sm:text-3xl font-600"
        >
          {supportedCryptos.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Live Price */}
      {livePrice?.price && (
        <div className="mb-16 sm:mb-20 pb-12 border-b border-slate-700/50">
          <p className="text-label mb-2">Current Market Price</p>
          <p className="text-4xl sm:text-5xl font-700 text-neutral animate-fade-in-up">
            ${livePrice.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </p>
          {livePrice.change24h !== 0 && (
            <p
              className={`text-sm mt-4 ${
                livePrice.change24h >= 0 ? 'text-profit' : 'text-loss'
              }`}
            >
              24h: {livePrice.change24h.toFixed(2)}% · used for leverage estimation
            </p>
          )}
        </div>
      )}

      {/* Initial Capital */}
      <div className="mb-16 sm:mb-20">
        <label className="text-label mb-2 block">Initial Capital</label>
        <div className="flex items-baseline gap-4">
          <input
            type="number"
            inputMode="decimal"
            step="1"
            value={capital}
            onChange={(e) => setCapital(e.target.value)}
            placeholder="10,000"
            className={`input-field flex-1 text-3xl sm:text-4xl font-600 text-metric ${
              errors.capital ? 'border-loss' : ''
            }`}
          />
          <span className="text-label font-700">USD</span>
        </div>
        {errors.capital && <p className="text-xs text-loss mt-3">{errors.capital}</p>}
      </div>

      {/* Risk % and Timeframe */}
      <div className="grid grid-cols-2 gap-8 mb-16 sm:mb-20">
        <div>
          <label className="text-label mb-2 block">Risk Per Trade</label>
          <div className="flex items-baseline gap-2">
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0.1"
              max="100"
              value={riskPct}
              onChange={(e) => setRiskPct(e.target.value)}
              placeholder="10"
              className={`input-field text-2xl sm:text-3xl font-600 text-metric ${
                errors.riskPct ? 'border-loss' : ''
              }`}
            />
            <span className="text-label font-700">%</span>
          </div>
          {errors.riskPct && <p className="text-xs text-loss mt-3">{errors.riskPct}</p>}
          {riskDollar > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              =${riskDollar.toLocaleString('en-US', { maximumFractionDigits: 0 })} per trade
            </p>
          )}
        </div>

        <div>
          <label className="text-label mb-2 block">Timeframe</label>
          <input
            type="number"
            inputMode="decimal"
            step="1"
            min="1"
            value={timeframeValue}
            onChange={(e) => setTimeframeValue(e.target.value)}
            placeholder="90"
            className={`input-field text-2xl sm:text-3xl font-600 text-metric ${
              errors.timeframe ? 'border-loss' : ''
            }`}
          />
          <div className="flex gap-2 mt-3">
            {(['days', 'weeks', 'months'] as TimeUnit[]).map((unit) => (
              <button
                key={unit}
                type="button"
                onClick={() => setTimeUnit(unit)}
                className={`text-xs font-600 px-3 py-1.5 rounded-md capitalize transition-all ${
                  timeUnit === unit
                    ? 'bg-neutral/10 border border-neutral/30 text-neutral'
                    : 'bg-gray-700/30 border border-gray-600/50 text-gray-400 hover:border-gray-500'
                }`}
              >
                {unit}
              </button>
            ))}
          </div>
          {errors.timeframe && <p className="text-xs text-loss mt-3">{errors.timeframe}</p>}
        </div>
      </div>

      {/* Target Profit */}
      <div className="mb-16 sm:mb-20">
        <label className="text-label mb-2 block">Target Profit</label>
        <div className="flex items-baseline gap-4">
          <input
            type="number"
            inputMode="decimal"
            step="1"
            value={targetProfit}
            onChange={(e) => setTargetProfit(e.target.value)}
            placeholder="15,000"
            className={`input-field flex-1 text-3xl sm:text-4xl font-600 text-metric ${
              errors.targetProfit ? 'border-loss' : ''
            }`}
          />
          <span className="text-label font-700">USD</span>
        </div>
        {errors.targetProfit && (
          <p className="text-xs text-loss mt-3">{errors.targetProfit}</p>
        )}
        {returnPct > 0 && (
          <p className="text-xs text-gray-400 mt-2">
            {returnPct.toFixed(0)}% return on capital
          </p>
        )}
      </div>

      <button
        type="submit"
        className="btn-primary group w-full flex items-center justify-center gap-3"
      >
        <span>Generate Plan</span>
        <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
      </button>
    </form>
  );
}
