import { Candle, SwingPoint } from '@/types/smc';

export function detectSwings(
  candles: Candle[],
  leftPivot: number,
  rightPivot: number
): { highs: SwingPoint[]; lows: SwingPoint[] } {
  const highs: SwingPoint[] = [];
  const lows: SwingPoint[] = [];

  for (let i = leftPivot; i < candles.length - rightPivot; i++) {
    const current = candles[i];
    
    // Check Swing High
    let isHigh = true;
    for (let j = 1; j <= leftPivot; j++) {
      if (candles[i - j].high > current.high) {
        isHigh = false;
        break;
      }
    }
    if (isHigh) {
      for (let j = 1; j <= rightPivot; j++) {
        if (candles[i + j].high >= current.high) { // strict greater on right to avoid dupes
          isHigh = false;
          break;
        }
      }
    }

    if (isHigh) {
      highs.push({
        type: 'High',
        index: i,
        time: current.time,
        price: current.high,
        mitigated: false,
      });
    }

    // Check Swing Low
    let isLow = true;
    for (let j = 1; j <= leftPivot; j++) {
      if (candles[i - j].low < current.low) {
        isLow = false;
        break;
      }
    }
    if (isLow) {
      for (let j = 1; j <= rightPivot; j++) {
        if (candles[i + j].low <= current.low) { // strict lesser on right
          isLow = false;
          break;
        }
      }
    }

    if (isLow) {
      lows.push({
        type: 'Low',
        index: i,
        time: current.time,
        price: current.low,
        mitigated: false,
      });
    }
  }

  return { highs, lows };
}
