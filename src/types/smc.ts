export interface Candle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface SMCConfig {
  leftPivotLength: number;
  rightPivotLength: number;
}

export type SwingType = 'High' | 'Low';

export interface SwingPoint {
  type: SwingType;
  index: number;
  time: number;
  price: number;
  mitigated: boolean; // Has price broken it?
  label?: 'HH' | 'LH' | 'HL' | 'LL';
}

export type Direction = 'Bullish' | 'Bearish';
export type Trend = 'Uptrend' | 'Downtrend' | 'Range';
export type OrderFlow = 'Bullish' | 'Bearish' | 'Neutral';

export interface LineFeature {
  type: Direction;
  startIndex: number;
  startTime: number;
  endIndex: number;
  endTime: number;
  price: number;
}

export interface ZoneFeature {
  type: Direction;
  startIndex: number;
  startTime: number;
  endIndex: number; // For plotting, it extends until mitigated
  endTime: number;
  top: number;
  bottom: number;
  mitigated: boolean;
  mitigatedIndex?: number;
  mitigatedTime?: number;
}

export interface SMCResult {
  swingHighs: SwingPoint[];
  swingLows: SwingPoint[];
  bos: LineFeature[];
  choch: LineFeature[];
  idm: LineFeature[]; // Inducement might be represented as a line broken
  fvgs: ZoneFeature[];
  orderBlocks: ZoneFeature[];
  trend: Trend;
  orderFlow: OrderFlow;
}

export interface SMCColors {
  bullishBos: string;
  bearishBos: string;
  bullishChoch: string;
  bearishChoch: string;
  bullishFvg: string;
  bearishFvg: string;
  bullishOb: string;
  bearishOb: string;
  idm: string;
  swingHigh: string;
  swingLow: string;
}

export const defaultColors: SMCColors = {
  bullishBos: '#22c55e', // Green
  bearishBos: '#ef4444', // Red
  bullishChoch: '#3b82f6', // Blue
  bearishChoch: '#f97316', // Orange
  bullishFvg: 'rgba(34, 197, 94, 0.2)',
  bearishFvg: 'rgba(239, 68, 68, 0.2)',
  bullishOb: 'rgba(59, 130, 246, 0.2)',
  bearishOb: 'rgba(249, 115, 22, 0.2)',
  idm: '#a855f7', // Purple
  swingHigh: '#ef4444',
  swingLow: '#22c55e',
};
