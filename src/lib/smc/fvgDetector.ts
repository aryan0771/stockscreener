import { Candle, ZoneFeature } from '@/types/smc';

export function detectFVGs(candles: Candle[]): ZoneFeature[] {
  const fvgs: ZoneFeature[] = [];

  // Need at least 3 candles to detect an FVG
  for (let i = 2; i < candles.length; i++) {
    const c1 = candles[i - 2];
    const c2 = candles[i - 1]; // The gap candle
    const c3 = candles[i];

    // Bullish FVG
    if (c1.high < c3.low) {
      // Ensure c2 is actually bullish (optional but common in strict SMC)
      // We will just check the gap
      fvgs.push({
        type: 'Bullish',
        startIndex: i - 1,
        startTime: c2.time,
        endIndex: candles.length - 1, // Default extends to end
        endTime: candles[candles.length - 1].time,
        top: c3.low,
        bottom: c1.high,
        mitigated: false
      });
    }

    // Bearish FVG
    if (c1.low > c3.high) {
      fvgs.push({
        type: 'Bearish',
        startIndex: i - 1,
        startTime: c2.time,
        endIndex: candles.length - 1, // Default extends to end
        endTime: candles[candles.length - 1].time,
        top: c1.low,
        bottom: c3.high,
        mitigated: false
      });
    }
  }

  return fvgs;
}
