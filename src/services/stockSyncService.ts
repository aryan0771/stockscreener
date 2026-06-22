import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();
import { prisma } from '@/lib/db';

/**
 * Service to sync stock data from Yahoo Finance to our master Stock table.
 */
export class StockSyncService {
  /**
   * Syncs a single stock by ticker.
   */
  static async syncStock(ticker: string) {
    try {
      // 1. Check if we already have fresh data (updated within the last 24 hours)
      const existingStock = await prisma.stock.findUnique({ where: { ticker } });
      if (existingStock) {
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        
        if (existingStock.updatedAt > oneDayAgo && existingStock.fiftyTwoWeekHigh !== null) {
          // It's fresh enough, return cached DB version
          return existingStock;
        }
      }

      // Fetch quote summary modules: price, defaultKeyStatistics, financialData, summaryProfile, summaryDetail
      const queryOptions = {
        modules: ['price', 'defaultKeyStatistics', 'financialData', 'summaryProfile', 'summaryDetail'] as any,
      };
      const result: any = await yahooFinance.quoteSummary(ticker, queryOptions);

      const price = result.price;
      const stats = result.defaultKeyStatistics;
      const financial = result.financialData;
      const profile = result.summaryProfile;
      const detail = result.summaryDetail;

      if (!price) {
        throw new Error(`Could not fetch price data for ${ticker}`);
      }

      const companyName = price.longName || price.shortName || ticker;
      const sector = profile?.sector || 'Unknown';
      const industry = profile?.industry || 'Unknown';
      const exchange = price.exchangeName || 'Unknown';

      const marketCap = price.marketCap || undefined;
      const currentPrice = price.regularMarketPrice || undefined;
      
      const eps = stats?.trailingEps || undefined;
      let pe = profile?.trailingPE || stats?.trailingPE || undefined;
      
      // Calculate PE manually if it's missing but we have current price and EPS
      if (!pe && currentPrice && eps && eps > 0) {
        pe = currentPrice / eps;
      }

      const pb = stats?.priceToBook || undefined;
      const roe = financial?.returnOnEquity || undefined;
      // ROCE is not directly available, but we might approximate or leave null
      const debtToEquity = financial?.debtToEquity || undefined;
      const dividendYield = profile?.dividendYield || undefined;
      const revenueGrowth = financial?.revenueGrowth || undefined;
      const profitGrowth = financial?.earningsGrowth || undefined;

      const promoterHolding = stats?.heldPercentInsiders ? stats.heldPercentInsiders * 100 : undefined;
      const fiiHolding = stats?.heldPercentInstitutions ? stats.heldPercentInstitutions * 100 : undefined;

      // Basic intrinsic value approximation (Graham Formula approximation or simple DCF placeholder)
      // Since a robust calculation requires complex DCF, we'll use a basic placeholder calculation if EPS and Growth are available
      let intrinsicValue: number | undefined = undefined;
      let fairValue: number | undefined = undefined;
      let marginOfSafety: number | undefined = undefined;

      if (eps && eps > 0 && profitGrowth !== undefined) {
        // Benjamin Graham Formula: V = EPS x (8.5 + 2g) * 4.4 / Y
        // Simplified V = EPS * (8.5 + 2 * (profitGrowth * 100))
        const growth = Math.max(0, profitGrowth * 100);
        intrinsicValue = eps * (8.5 + 2 * growth);
        fairValue = intrinsicValue; // We can differentiate later
        
        if (currentPrice && intrinsicValue > 0) {
          marginOfSafety = ((intrinsicValue - currentPrice) / intrinsicValue) * 100;
        }
      }

      const fiftyTwoWeekHigh = detail?.fiftyTwoWeekHigh || undefined;
      const fiftyTwoWeekLow = detail?.fiftyTwoWeekLow || undefined;

      // Calculate Industry P/E
      let industryPe: number | undefined = undefined;
      if (industry && industry !== 'Unknown') {
        const industryStocks = await prisma.stock.aggregate({
          where: { industry, pe: { not: null } },
          _avg: { pe: true },
        });
        if (industryStocks._avg.pe) {
          industryPe = industryStocks._avg.pe;
        }
      }

      // Calculate RSI (14-day) using local historical data
      let rsi: number | undefined = undefined;
      const recentHistory = await prisma.historicalPrice.findMany({
        where: { stockId: existingStock?.id },
        orderBy: { date: 'desc' },
        take: 15,
      });

      if (recentHistory.length >= 15) {
        let gains = 0;
        let losses = 0;
        // reverse to process chronological
        const chronoHistory = recentHistory.reverse();
        for (let i = 1; i < chronoHistory.length; i++) {
          const change = chronoHistory[i].close - chronoHistory[i - 1].close;
          if (change > 0) gains += change;
          else losses += Math.abs(change);
        }
        const avgGain = gains / 14;
        const avgLoss = losses / 14;
        if (avgLoss === 0) {
          rsi = 100;
        } else {
          const rs = avgGain / avgLoss;
          rsi = 100 - (100 / (1 + rs));
        }
      }

      // Upsert into database
      const stock = await prisma.stock.upsert({
        where: { ticker },
        update: {
          companyName,
          sector,
          industry,
          exchange,
          marketCap,
          currentPrice,
          pe,
          pb,
          eps,
          roe,
          debtToEquity,
          dividendYield,
          revenueGrowth,
          profitGrowth,
          promoterHolding,
          fiiHolding,
          intrinsicValue,
          fairValue,
          marginOfSafety,
          fiftyTwoWeekHigh,
          fiftyTwoWeekLow,
          rsi,
          industryPe,
        },
        create: {
          ticker,
          companyName,
          sector,
          industry,
          exchange,
          marketCap,
          currentPrice,
          pe,
          pb,
          eps,
          roe,
          debtToEquity,
          dividendYield,
          revenueGrowth,
          profitGrowth,
          promoterHolding,
          fiiHolding,
          intrinsicValue,
          fairValue,
          marginOfSafety,
          fiftyTwoWeekHigh,
          fiftyTwoWeekLow,
          rsi,
          industryPe,
        },
      });

      return stock;
    } catch (error) {
      console.error(`Error syncing stock ${ticker}:`, error);
      throw error;
    }
  }

  /**
   * Sync a batch of tickers
   */
  static async syncBatch(tickers: string[]) {
    const results = [];
    for (const ticker of tickers) {
      try {
        const result = await this.syncStock(ticker);
        results.push({ ticker, status: 'success', data: result });
      } catch (error: any) {
        results.push({ ticker, status: 'error', message: error.message });
      }
    }
    return results;
  }

  /**
   * Fetch historical daily data for charting.
   */
  static async getHistoricalData(ticker: string, period1: string, period2: string = new Date().toISOString().split('T')[0]) {
    try {
      const stock = await prisma.stock.findUnique({ where: { ticker } });
      if (!stock) {
        throw new Error(`Stock ${ticker} not found in database.`);
      }

      const p1Date = new Date(period1);
      const p2Date = new Date(period2);

      // Check DB for existing data
      const existingData = await prisma.historicalPrice.findMany({
        where: {
          stockId: stock.id,
          date: {
            gte: p1Date,
            lte: p2Date,
          },
        },
        orderBy: { date: 'asc' },
      });

      // Simple heuristic: if there's no data, or the most recent data is stale, or we are missing the older data chunk.
      const needsSync = existingData.length === 0 || 
        (existingData[existingData.length - 1].date.getTime() < p2Date.getTime() - 7 * 24 * 60 * 60 * 1000) ||
        (existingData[0].date.getTime() > p1Date.getTime() + 7 * 24 * 60 * 60 * 1000);

      if (needsSync) {
        const yahooData: any[] = await yahooFinance.historical(ticker, {
          period1,
          period2,
          interval: '1d',
        });

        if (yahooData && yahooData.length > 0) {
          // Clear old potentially unadjusted data to ensure clean calculation
          await prisma.historicalPrice.deleteMany({
            where: { stockId: stock.id }
          });

          // Insert into DB using Adjusted Close ratio to account for splits/dividends
          const recordsToInsert = yahooData.map((day: any) => {
            const adjRatio = day.adjClose && day.close ? day.adjClose / day.close : 1;
            return {
              stockId: stock.id,
              date: day.date,
              open: day.open * adjRatio,
              high: day.high * adjRatio,
              low: day.low * adjRatio,
              close: day.adjClose || day.close, // Equivalent to day.close * adjRatio
              volume: day.volume,
            };
          });

          await prisma.historicalPrice.createMany({
            data: recordsToInsert,
            skipDuplicates: true,
          });
          
          // Re-fetch from DB to guarantee correct ordering and consistency
          const updatedData = await prisma.historicalPrice.findMany({
            where: {
              stockId: stock.id,
              date: {
                gte: p1Date,
                lte: p2Date,
              },
            },
            orderBy: { date: 'asc' },
          });
          
          return updatedData.map((day) => ({
            time: day.date.toISOString().split('T')[0],
            open: day.open,
            high: day.high,
            low: day.low,
            close: day.close,
            value: day.volume || 0,
            color: day.close >= day.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
          }));
        }
      }

      // Return existing data if no sync was needed or sync returned no new data
      return existingData.map((day) => ({
        time: day.date.toISOString().split('T')[0],
        open: day.open,
        high: day.high,
        low: day.low,
        close: day.close,
        value: day.volume || 0,
        color: day.close >= day.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
      }));

    } catch (error) {
      console.error(`Error fetching historical data for ${ticker}:`, error);
      return [];
    }
  }
}
