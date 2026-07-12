import { Candle } from '@/types/smc';

/**
 * Aggregates lower timeframe candles into higher timeframe candles.
 * @param candles Array of base timeframe candles (must be sorted chronologically)
 * @param periodMinutes The target timeframe in minutes
 */
export function aggregateCandles(candles: Candle[], periodMinutes: number): Candle[] {
  if (candles.length === 0) return [];
  if (periodMinutes <= 1) return candles; // Assuming base is 1m, or if it's identical

  const periodSeconds = periodMinutes * 60;
  const aggregated: Candle[] = [];
  
  let currentAgg: Candle | null = null;

  for (const candle of candles) {
    // Align time to the start of the period bucket
    // E.g., for 3m (180s), 10:01:00 becomes 10:00:00
    const bucketTime = Math.floor(candle.time / periodSeconds) * periodSeconds;

    if (!currentAgg) {
      currentAgg = {
        time: bucketTime,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume || 0
      };
    } else if (bucketTime === currentAgg.time) {
      // Update existing aggregated candle
      currentAgg.high = Math.max(currentAgg.high, candle.high);
      currentAgg.low = Math.min(currentAgg.low, candle.low);
      currentAgg.close = candle.close;
      if (candle.volume && currentAgg.volume !== undefined) {
        currentAgg.volume += candle.volume;
      }
    } else {
      // Push completed and start new
      aggregated.push(currentAgg);
      currentAgg = {
        time: bucketTime,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume || 0
      };
    }
  }

  if (currentAgg) {
    aggregated.push(currentAgg);
  }

  return aggregated;
}
