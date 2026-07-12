import { Candle, SMCConfig, SMCResult, SwingPoint, LineFeature, ZoneFeature, Trend, OrderFlow } from '@/types/smc';
import { detectSwings } from './swingDetector';
import { detectFVGs } from './fvgDetector';

export function runSMCEngine(candles: Candle[], config: SMCConfig): SMCResult {
  const { highs, lows } = detectSwings(candles, config.leftPivotLength, config.rightPivotLength);
  const fvgs = detectFVGs(candles); // FVGs can be detected independently
  
  const bos: LineFeature[] = [];
  const choch: LineFeature[] = [];
  const orderBlocks: ZoneFeature[] = [];
  const idm: LineFeature[] = [];

  let trend: Trend = 'Range';
  let orderFlow: OrderFlow = 'Neutral';

  // We need to track the "active" swing points that define our current range.
  let currentSwingHigh: SwingPoint | null = null;
  let currentSwingLow: SwingPoint | null = null;

  // Track all valid structure points to find order blocks later
  let lastBullishBreakIndex = -1;
  let lastBearishBreakIndex = -1;

  // We need to process candles chronologically to detect breaks.
  // Swings are identified in hindsight (e.g. at index i + rightPivot).
  // But a break happens exactly at candle index i.
  
  // Create an array of swings sorted by time (or index)
  const allSwings = [...highs, ...lows].sort((a, b) => a.index - b.index);
  
  let nextSwingIdx = 0;
  const activeHighs: SwingPoint[] = [];
  const activeLows: SwingPoint[] = [];

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];

    // Add swings as they become "confirmed" (i >= swing.index + rightPivot)
    while (nextSwingIdx < allSwings.length && i >= allSwings[nextSwingIdx].index + config.rightPivotLength) {
      const swing = allSwings[nextSwingIdx];
      if (swing.type === 'High') {
        swing.label = trend === 'Downtrend' ? 'LH' : 'HH';
        activeHighs.push(swing);
        currentSwingHigh = swing;
      } else {
        swing.label = trend === 'Uptrend' ? 'HL' : 'LL';
        activeLows.push(swing);
        currentSwingLow = swing;
      }
      nextSwingIdx++;
    }

    // Check for BOS / CHoCH
    // A simplified model: 
    // If we break the current swing high -> Bullish break.
    // If it's the first break against a bearish trend -> CHoCH, else BOS.
    
    // Check Bullish Break
    if (currentSwingHigh && !currentSwingHigh.mitigated && candle.close > currentSwingHigh.price) {
      currentSwingHigh.mitigated = true;
      
      const isChoch = trend === 'Downtrend' || (trend === 'Range' && orderFlow === 'Bearish');
      
      const feature: LineFeature = {
        type: 'Bullish',
        startIndex: currentSwingHigh.index,
        startTime: currentSwingHigh.time,
        endIndex: i,
        endTime: candle.time,
        price: currentSwingHigh.price
      };

      if (isChoch) {
        choch.push(feature);
        trend = 'Uptrend';
      } else {
        bos.push(feature);
        trend = 'Uptrend';
      }
      
      orderFlow = 'Bullish';
      lastBullishBreakIndex = i;

      // Detect Bullish Order Block: Last bearish candle before the break
      // Search backwards from the break point to the swing low
      let obFound = false;
      const searchLimit = currentSwingLow ? currentSwingLow.index : Math.max(0, i - 50);
      for (let j = i - 1; j >= searchLimit; j--) {
        if (candles[j].close < candles[j].open) { // Bearish candle
          orderBlocks.push({
            type: 'Bullish',
            startIndex: j,
            startTime: candles[j].time,
            endIndex: candles.length - 1,
            endTime: candles[candles.length - 1].time,
            top: candles[j].high,
            bottom: candles[j].low,
            mitigated: false
          });
          obFound = true;
          break;
        }
      }

      // Reset swing high to find the next one
      currentSwingHigh = null;
    }

    // Check Bearish Break
    if (currentSwingLow && !currentSwingLow.mitigated && candle.close < currentSwingLow.price) {
      currentSwingLow.mitigated = true;
      
      const isChoch = trend === 'Uptrend' || (trend === 'Range' && orderFlow === 'Bullish');
      
      const feature: LineFeature = {
        type: 'Bearish',
        startIndex: currentSwingLow.index,
        startTime: currentSwingLow.time,
        endIndex: i,
        endTime: candle.time,
        price: currentSwingLow.price
      };

      if (isChoch) {
        choch.push(feature);
        trend = 'Downtrend';
      } else {
        bos.push(feature);
        trend = 'Downtrend';
      }
      
      orderFlow = 'Bearish';
      lastBearishBreakIndex = i;

      // Detect Bearish Order Block: Last bullish candle before the break
      let obFound = false;
      const searchLimit = currentSwingHigh ? currentSwingHigh.index : Math.max(0, i - 50);
      for (let j = i - 1; j >= searchLimit; j--) {
        if (candles[j].close > candles[j].open) { // Bullish candle
          orderBlocks.push({
            type: 'Bearish',
            startIndex: j,
            startTime: candles[j].time,
            endIndex: candles.length - 1,
            endTime: candles[candles.length - 1].time,
            top: candles[j].high,
            bottom: candles[j].low,
            mitigated: false
          });
          obFound = true;
          break;
        }
      }

      // Reset swing low
      currentSwingLow = null;
    }

    // Check Order Block mitigation
    for (const ob of orderBlocks) {
      if (!ob.mitigated && i > ob.startIndex) {
        if (ob.type === 'Bullish' && candle.low <= ob.top) {
          ob.mitigated = true;
          ob.endIndex = i;
          ob.endTime = candle.time;
        } else if (ob.type === 'Bearish' && candle.high >= ob.bottom) {
          ob.mitigated = true;
          ob.endIndex = i;
          ob.endTime = candle.time;
        }
      }
    }
  }

  // Check FVG mitigation
  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    for (const fvg of fvgs) {
      if (!fvg.mitigated && i > fvg.startIndex) {
        if (fvg.type === 'Bullish' && candle.low <= fvg.top) {
          fvg.mitigated = true;
          fvg.endIndex = i;
          fvg.endTime = candle.time;
        } else if (fvg.type === 'Bearish' && candle.high >= fvg.bottom) {
          fvg.mitigated = true;
          fvg.endIndex = i;
          fvg.endTime = candle.time;
        }
      }
    }
  }

  return {
    swingHighs: highs,
    swingLows: lows,
    bos,
    choch,
    idm,
    fvgs,
    orderBlocks,
    trend,
    orderFlow,
  };
}
