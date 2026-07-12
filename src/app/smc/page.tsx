"use client";

import React, { useState, useEffect, useCallback } from 'react';
import SMCControls from '@/components/smc/SMCControls';
import SMCChart from '@/components/smc/SMCChart';
import { Candle, SMCColors, SMCResult, defaultColors } from '@/types/smc';
import { runSMCEngine } from '@/lib/smc/engine';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export default function SMCPage() {
  const [isClient, setIsClient] = useState(false);
  
  const [instrument, setInstrument] = useState('NIFTY 50');
  const [timeframe, setTimeframe] = useState('15m');
  const [pivotLengths, setPivotLengths] = useState({ left: 5, right: 5 });
  const [toggles, setToggles] = useState({ bos: true, choch: true, idm: true, fvg: true, ob: true });
  const [colors, setColors] = useState<SMCColors>(defaultColors);

  const [candles, setCandles] = useState<Candle[]>([]);
  const [smcResult, setSmcResult] = useState<SMCResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load persisted settings on mount
  useEffect(() => {
    setIsClient(true);
    const savedColors = localStorage.getItem('smc_colors');
    if (savedColors) {
      try { setColors(JSON.parse(savedColors)); } catch (e) {}
    }
    const savedConfig = localStorage.getItem('smc_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed.instrument) setInstrument(parsed.instrument);
        if (parsed.timeframe) setTimeframe(parsed.timeframe);
        if (parsed.pivotLengths) setPivotLengths(parsed.pivotLengths);
        if (parsed.toggles) setToggles(parsed.toggles);
      } catch (e) {}
    }
  }, []);

  // Save settings when they change
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('smc_colors', JSON.stringify(colors));
      localStorage.setItem('smc_config', JSON.stringify({ instrument, timeframe, pivotLengths, toggles }));
    }
  }, [colors, instrument, timeframe, pivotLengths, toggles, isClient]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/smc/data?symbol=${encodeURIComponent(instrument)}&timeframe=${timeframe}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch data');
      if (json.success && json.data) {
        setCandles(json.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [instrument, timeframe]);

  // Fetch on mount and when instrument/timeframe change
  useEffect(() => {
    if (isClient) {
      fetchData();
    }
  }, [fetchData, isClient]);

  // Run SMC Engine when candles or pivot lengths change
  useEffect(() => {
    if (candles.length > 0) {
      const result = runSMCEngine(candles, {
        leftPivotLength: pivotLengths.left,
        rightPivotLength: pivotLengths.right,
      });
      setSmcResult(result);
    } else {
      setSmcResult(null);
    }
  }, [candles, pivotLengths]);

  if (!isClient) return null; // Avoid hydration mismatch

  return (
    <div className="flex h-screen w-full bg-[#0b0e14] text-white font-sans overflow-hidden">
      
      {/* Controls Sidebar */}
      <SMCControls
        instrument={instrument} setInstrument={setInstrument}
        timeframe={timeframe} setTimeframe={setTimeframe}
        pivotLengths={pivotLengths} setPivotLengths={setPivotLengths}
        toggles={toggles} setToggles={setToggles}
        colors={colors} setColors={setColors}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Header Bar */}
        <header className="h-14 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              SMC Analyzer
            </h1>
            <div className="h-4 w-px bg-slate-700"></div>
            <span className="text-slate-400 font-medium">
              {instrument} <span className="text-slate-600 px-1">•</span> {timeframe}
            </span>
          </div>

          {/* Status Badges */}
          {smcResult && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full text-sm border border-slate-700">
                <span className="text-slate-400">Trend:</span>
                {smcResult.trend === 'Uptrend' && <span className="text-green-400 flex items-center"><ArrowUpRight size={14} className="mr-1"/> Uptrend</span>}
                {smcResult.trend === 'Downtrend' && <span className="text-red-400 flex items-center"><ArrowDownRight size={14} className="mr-1"/> Downtrend</span>}
                {smcResult.trend === 'Range' && <span className="text-yellow-400 flex items-center"><Minus size={14} className="mr-1"/> Range</span>}
              </div>
              <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full text-sm border border-slate-700">
                <span className="text-slate-400">Order Flow:</span>
                <span className={smcResult.orderFlow === 'Bullish' ? 'text-green-400' : smcResult.orderFlow === 'Bearish' ? 'text-red-400' : 'text-slate-300'}>
                  {smcResult.orderFlow}
                </span>
              </div>
            </div>
          )}
        </header>

        {/* Chart Area */}
        <div className="flex-1 p-6 overflow-hidden relative">
          
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded max-w-md text-center">
                <p className="font-semibold mb-2">Error Loading Data</p>
                <p className="text-sm opacity-90">{error}</p>
              </div>
            </div>
          )}

          <div className="w-full h-full flex flex-col shadow-2xl rounded-xl overflow-hidden border border-slate-800/50">
            {candles.length > 0 ? (
              <SMCChart 
                candles={candles} 
                smcResult={smcResult} 
                colors={colors} 
                visibleToggles={toggles} 
              />
            ) : (
              !loading && !error && (
                <div className="flex-1 flex items-center justify-center text-slate-500">
                  No data available for {instrument} at {timeframe}
                </div>
              )
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
