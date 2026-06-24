import { prisma } from "@/lib/db";
import { StockSyncService } from "@/services/stockSyncService";
import { IndicatorService } from "./indicator.service";
import { HistoricalPrice, Stock } from "@prisma/client";

export interface ScannerParams {
  trendSMA?: number;
  pullbackSMA?: number;
  distancePercent?: number;
  touchLookback?: number;
  confirmation?: "bullish-candle" | "break-high" | "engulfing" | "none";
  minVolume?: number;
  maxPrice?: number;
}

export class ScannerService {
  /**
   * Run the SMA44 Pullback screener across all stocks (or Nifty 500)
   */
  static async runSma44Scan(params: ScannerParams) {
    const {
      trendSMA = 200,
      pullbackSMA = 44,
      distancePercent = 3,
      touchLookback = 5,
      confirmation = "break-high",
      minVolume = 100000,
      maxPrice,
    } = params;

    // Fetch all actively tracked stocks
    // In a full production system, we'd filter strictly by Exchange or Index (e.g. NIFTY 500)
    const stocks = await prisma.stock.findMany({
      where: maxPrice ? { currentPrice: { lte: maxPrice } } : undefined,
      // We can sort by marketCap to prioritize large caps
      orderBy: { marketCap: 'desc' },
    });

    const matches = [];

    // Process sequentially to respect Yahoo Finance rate limits if it needs to fetch.
    // In a real environment, we would batch this.
    for (const stock of stocks) {
      try {
        const isMatch = await this.evaluateStock(stock, {
          trendSMA,
          pullbackSMA,
          distancePercent,
          touchLookback,
          confirmation,
          minVolume,
        });

        if (isMatch) {
          matches.push(isMatch);
        }
      } catch (error) {
        console.error(`Failed to scan ${stock.ticker}:`, error);
        // Continue to next stock
      }
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);

    // Save results to DB only for the main 44SMA scan (to avoid penny scan overwriting it)
    if (!maxPrice) {
      await this.saveResults(matches);
    }

    return matches;
  }

  private static async evaluateStock(stock: Stock, params: Omit<Required<ScannerParams>, 'maxPrice'>) {
    // Determine the date range needed (we need at least 250 days of data for a 200 SMA)
    // 250 trading days is roughly 1 year.
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    // Actually, to get 250 trading days safely, go back 1.5 years.
    oneYearAgo.setMonth(oneYearAgo.getMonth() - 6);
    
    const period1 = oneYearAgo.toISOString().split('T')[0];

    // Fetch historical data using StockSyncService to handle caching & fresh data
    const rawData = await StockSyncService.getHistoricalData(stock.ticker, period1);
    
    // getHistoricalData returns mapped data. We need to parse it back or use the raw HistoricalPrice format.
    // getHistoricalData returns: { time: string, open, high, low, close, volume }
    // Let's map it into a compatible format for our indicators
    if (!rawData || rawData.length < 200) return null; // Not enough data for SMA200

    // Since getHistoricalData maps `date` to `time` string, let's map it back to Date
    const data: HistoricalPrice[] = rawData.map((d: any) => ({
      id: '',
      stockId: stock.id,
      date: new Date(d.time),
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.value || 0,
    }));

    const lastBar = data[data.length - 1];

    // 1. Optional Volume Filter
    if (lastBar.volume! < params.minVolume) return null;

    // Calculate SMA series
    const sma200Series = IndicatorService.calculateSMASeries(data, params.trendSMA);
    const sma44Series = IndicatorService.calculateSMASeries(data, params.pullbackSMA);

    const currentSma200 = sma200Series[sma200Series.length - 1];
    const currentSma44 = sma44Series[sma44Series.length - 1];

    if (!currentSma200 || !currentSma44) return null;

    // 2. Trend Filter (Close > SMA200)
    if (lastBar.close <= currentSma200) return null;

    // Also usually we want SMA44 > SMA200 for a solid uptrend
    if (currentSma44 <= currentSma200) return null;

    // 3. Pullback Filter (Distance from SMA44)
    const distTo44 = Math.abs(lastBar.close - currentSma44) / currentSma44 * 100;
    if (distTo44 > params.distancePercent) return null;

    // 4. Recent Touch Filter
    const touchResult = IndicatorService.checkRecentTouch(data, sma44Series, params.touchLookback);
    if (!touchResult.touched) return null;

    // 5. Bullish Confirmation
    if (params.confirmation !== "none") {
      const isConfirmed = IndicatorService.detectBullishConfirmation(data, params.confirmation as any);
      if (!isConfirmed) return null;
    }

    // Passed all filters! Calculate a score.
    // Lower distance from SMA44 = higher score
    // Higher distance above SMA200 = higher score
    const distAbove200 = (lastBar.close - currentSma200) / currentSma200 * 100;
    
    // Scoring Logic: (10 - distTo44) + distAbove200 + (relative volume boost)
    const avgVolume20 = IndicatorService.calculateSMA(data.map(d => d.volume!), 20);
    const volumeRatio = lastBar.volume! / (avgVolume20 || 1);
    
    const score = Math.max(0, (10 - distTo44)) * 2 + distAbove200 + (volumeRatio * 5);

    return {
      stockId: stock.id,
      symbol: stock.ticker,
      companyName: stock.companyName,
      currentPrice: lastBar.close,
      sma44: currentSma44,
      sma200: currentSma200,
      distancePercent: distTo44,
      touchDate: touchResult.touchDate,
      confirmationType: params.confirmation,
      volume: lastBar.volume!,
      score: parseFloat(score.toFixed(2)),
    };
  }

  private static async saveResults(results: any[]) {
    // Clear old results of this strategy (in a real app you might want historical results, 
    // but for daily screeners we usually overwrite the current active list)
    await prisma.sma44ScreeningResult.deleteMany();

    if (results.length === 0) return;

    // Insert new results
    const recordsToInsert = results.map(r => ({
      stockId: r.stockId,
      currentPrice: r.currentPrice,
      sma44: r.sma44,
      sma200: r.sma200,
      distancePercent: r.distancePercent,
      touchDate: r.touchDate,
      confirmationType: r.confirmationType,
      volume: r.volume,
      score: r.score,
    }));

    await prisma.sma44ScreeningResult.createMany({
      data: recordsToInsert
    });
  }
}
