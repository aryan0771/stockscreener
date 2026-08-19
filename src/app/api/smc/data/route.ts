import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();
import { Candle } from '@/types/smc';
import { aggregateCandles } from '@/lib/smc/aggregator';

// Define how we map user timeframes to Yahoo Finance intervals and our custom aggregation
const timeframeMap: Record<string, { interval: any, aggregateMinutes: number | null }> = {
  '1m': { interval: '1m', aggregateMinutes: null },
  '2m': { interval: '2m', aggregateMinutes: null },
  '3m': { interval: '1m', aggregateMinutes: 3 },
  '5m': { interval: '5m', aggregateMinutes: null },
  '10m': { interval: '5m', aggregateMinutes: 10 },
  '15m': { interval: '15m', aggregateMinutes: null },
  '30m': { interval: '30m', aggregateMinutes: null },
  '45m': { interval: '15m', aggregateMinutes: 45 },
  '1h': { interval: '60m', aggregateMinutes: null },
  '2h': { interval: '60m', aggregateMinutes: 120 },
  '4h': { interval: '60m', aggregateMinutes: 240 },
  '1D': { interval: '1d', aggregateMinutes: null },
  '1W': { interval: '1wk', aggregateMinutes: null },
  '1M': { interval: '1mo', aggregateMinutes: null },
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let symbol = searchParams.get('symbol');
    const timeframe = searchParams.get('timeframe');

    if (!symbol || !timeframe) {
      return NextResponse.json({ error: 'Missing symbol or timeframe' }, { status: 400 });
    }

    // Map internal names to Yahoo Finance symbols
    if (symbol === 'NIFTY 50') symbol = '^NSEI';
    else if (symbol === 'BANKNIFTY') symbol = '^NSEBANK';
    else if (symbol === 'FINNIFTY') symbol = 'NIFTY_FIN_SERVICE.NS'; // Yahoo finance symbol for FINNIFTY might vary, testing commonly used ones.

    const mapping = timeframeMap[timeframe];
    if (!mapping) {
      return NextResponse.json({ error: 'Invalid timeframe' }, { status: 400 });
    }

    // Determine the range. For minute data, Yahoo limits to 7 days typically.
    // For 1m/2m/5m/15m/30m/60m we can go back 7-60 days max. 
    // We will request 30 days for 1m (might throw error if >7d depending on YF limits, let's use sensible defaults)
    // Actually, yf interval limits: 
    // 1m: max 7 days. 
    // 2m, 5m, 15m, 30m, 90m, 60m: max 60 days.
    const isMinute = mapping.interval === '1m';
    const period1 = isMinute ? new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) : new Date(Date.now() - 59 * 24 * 60 * 60 * 1000); // 6 days for 1m, 59 for others
    
    // For 1d, 1wk, 1mo we can fetch years.
    const isDailyOrMore = ['1d', '1wk', '1mo'].includes(mapping.interval);
    const finalPeriod1 = isDailyOrMore ? new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000) : period1;

    const queryOptions: any = {
      period1: finalPeriod1,
      interval: mapping.interval,
    };

    const result: any = await yahooFinance.chart(symbol, queryOptions);
    
    if (!result || !result.quotes) {
       return NextResponse.json({ error: 'No data found' }, { status: 404 });
    }

    // Map to Candle array
    let candles: Candle[] = result.quotes.map((q: any) => {
      // YF returns dates, we want Unix timestamp in seconds for lightweight-charts
      return {
        time: Math.floor(new Date(q.date).getTime() / 1000),
        open: q.open || 0,
        high: q.high || 0,
        low: q.low || 0,
        close: q.close || 0,
        volume: q.volume || 0,
      };
    }).filter(c => c.close > 0); // Remove empty data points

    // Apply custom aggregation if needed
    if (mapping.aggregateMinutes !== null) {
      candles = aggregateCandles(candles, mapping.aggregateMinutes);
    }

    return NextResponse.json({ success: true, data: candles });

  } catch (error: any) {
    console.error('Error fetching SMC data:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
