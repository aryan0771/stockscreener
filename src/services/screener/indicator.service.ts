import { HistoricalPrice } from "@prisma/client";

export class IndicatorService {
  /**
   * Calculates Simple Moving Average (SMA)
   */
  static calculateSMA(data: number[], period: number): number {
    if (data.length < period) return 0;
    const sum = data.slice(-period).reduce((a, b) => a + b, 0);
    return sum / period;
  }

  /**
   * Checks if price touched or crossed below the SMA within the last N candles
   */
  static checkRecentTouch(
    data: HistoricalPrice[],
    smaSeries: number[],
    lookback: number
  ): { touched: boolean; touchDate: Date | null } {
    if (data.length === 0 || smaSeries.length === 0) return { touched: false, touchDate: null };

    // We check the last N candles
    const startIdx = Math.max(0, data.length - lookback);
    
    // Scan backwards from the most recent to find the closest touch
    for (let i = data.length - 1; i >= startIdx; i--) {
      const bar = data[i];
      const smaVal = smaSeries[i];
      
      if (!smaVal) continue;

      // Touched if low goes at or below SMA
      if (bar.low <= smaVal && bar.close >= smaVal) {
         return { touched: true, touchDate: bar.date };
      }
      
      // Also consider "touch" if the open or close was very near or crossed it
      if (bar.low <= smaVal) {
         return { touched: true, touchDate: bar.date };
      }
    }

    return { touched: false, touchDate: null };
  }

  /**
   * Detects Bullish Confirmations at the current (last) candle
   */
  static detectBullishConfirmation(
    data: HistoricalPrice[],
    confirmationType: "bullish-candle" | "break-high" | "engulfing"
  ): boolean {
    if (data.length < 2) return false;

    const current = data[data.length - 1];
    const previous = data[data.length - 2];

    switch (confirmationType) {
      case "bullish-candle":
        // Current candle is green
        return current.close > current.open;
        
      case "break-high":
        // Current close breaks above previous high
        return current.close > previous.high;
        
      case "engulfing":
        // Bullish Engulfing Pattern
        // Previous is red, Current is green and engulfs the real body
        const prevIsRed = previous.close < previous.open;
        const currentIsGreen = current.close > current.open;
        const engulfsBody = current.open <= previous.close && current.close >= previous.open;
        return prevIsRed && currentIsGreen && engulfsBody;
        
      default:
        return true; // No specific confirmation required
    }
  }

  /**
   * Calculates the full SMA series mapping 1:1 to the data array
   */
  static calculateSMASeries(data: HistoricalPrice[], period: number): number[] {
    const smaSeries: number[] = new Array(data.length).fill(0);
    const prices = data.map((d) => d.close);
    
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += prices[i];
      if (i >= period) {
        sum -= prices[i - period];
        smaSeries[i] = sum / period;
      } else if (i === period - 1) {
        smaSeries[i] = sum / period;
      }
    }
    return smaSeries;
  }
}
