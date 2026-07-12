"use client";

import React from 'react';
import { SMCColors } from '@/types/smc';
import { Settings, BarChart2, Eye, Paintbrush } from 'lucide-react';

interface SMCControlsProps {
  instrument: string;
  setInstrument: (val: string) => void;
  timeframe: string;
  setTimeframe: (val: string) => void;
  pivotLengths: { left: number; right: number };
  setPivotLengths: (val: { left: number; right: number }) => void;
  toggles: { bos: boolean; choch: boolean; idm: boolean; fvg: boolean; ob: boolean };
  setToggles: (val: { bos: boolean; choch: boolean; idm: boolean; fvg: boolean; ob: boolean }) => void;
  colors: SMCColors;
  setColors: (val: SMCColors) => void;
}

const INSTRUMENTS = ['NIFTY 50', 'BANKNIFTY', 'FINNIFTY'];
const TIMEFRAMES = ['1m', '2m', '3m', '5m', '10m', '15m', '30m', '45m', '1h', '2h', '4h', '1D', '1W', '1M'];

export default function SMCControls({
  instrument, setInstrument,
  timeframe, setTimeframe,
  pivotLengths, setPivotLengths,
  toggles, setToggles,
  colors, setColors
}: SMCControlsProps) {

  const handleToggle = (key: keyof typeof toggles) => {
    setToggles({ ...toggles, [key]: !toggles[key] });
  };

  const handleColorChange = (key: keyof SMCColors, value: string) => {
    setColors({ ...colors, [key]: value });
  };

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 h-full overflow-y-auto p-4 flex flex-col gap-6 text-sm text-slate-300">
      
      {/* Instrument & Timeframe */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-slate-100 font-semibold mb-2">
          <BarChart2 size={16} /> Data Source
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Instrument</label>
          <select 
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500"
            value={instrument}
            onChange={e => setInstrument(e.target.value)}
          >
            {INSTRUMENTS.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Timeframe</label>
          <select 
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500"
            value={timeframe}
            onChange={e => setTimeframe(e.target.value)}
          >
            {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <hr className="border-slate-800" />

      {/* Settings */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-slate-100 font-semibold mb-2">
          <Settings size={16} /> Engine Config
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-slate-500 mb-1">Left Pivot</label>
            <input 
              type="number" min="1" max="50"
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
              value={pivotLengths.left}
              onChange={e => setPivotLengths({ ...pivotLengths, left: parseInt(e.target.value) || 5 })}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-slate-500 mb-1">Right Pivot</label>
            <input 
              type="number" min="1" max="50"
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
              value={pivotLengths.right}
              onChange={e => setPivotLengths({ ...pivotLengths, right: parseInt(e.target.value) || 5 })}
            />
          </div>
        </div>
      </div>

      <hr className="border-slate-800" />

      {/* Visibility */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-slate-100 font-semibold mb-2">
          <Eye size={16} /> Visibility
        </div>
        {Object.entries(toggles).map(([key, val]) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
            <input 
              type="checkbox" 
              className="rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500/20"
              checked={val}
              onChange={() => handleToggle(key as keyof typeof toggles)}
            />
            <span className="uppercase">{key}</span>
          </label>
        ))}
      </div>

      <hr className="border-slate-800" />

      {/* Colors */}
      <div className="space-y-3 pb-8">
        <div className="flex items-center gap-2 text-slate-100 font-semibold mb-2">
          <Paintbrush size={16} /> Colors
        </div>
        {Object.entries(colors).map(([key, val]) => {
          // Simplistic parsing for rgba to hex for color picker if needed, but standard input type color only takes hex
          // For this basic setup we just provide a text input for rgba and color input for hex
          const isRgba = val.startsWith('rgba');
          return (
            <div key={key} className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              {isRgba ? (
                <input 
                  type="text" 
                  className="w-20 bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-xs text-center"
                  value={val}
                  onChange={e => handleColorChange(key as keyof SMCColors, e.target.value)}
                />
              ) : (
                <input 
                  type="color" 
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
                  value={val}
                  onChange={e => handleColorChange(key as keyof SMCColors, e.target.value)}
                />
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
