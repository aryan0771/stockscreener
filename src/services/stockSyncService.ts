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
      // Fetch quote summary modules: price, defaultKeyStatistics, financialData
      const queryOptions = {
        modules: ['price', 'defaultKeyStatistics', 'financialData', 'summaryProfile'] as any,
      };
      const result: any = await yahooFinance.quoteSummary(ticker, queryOptions);

      const price = result.price;
      const stats = result.defaultKeyStatistics;
      const financial = result.financialData;
      const profile = result.summaryProfile;

      if (!price) {
        throw new Error(`Could not fetch price data for ${ticker}`);
      }

      const companyName = price.longName || price.shortName || ticker;
      const sector = profile?.sector || 'Unknown';
      const industry = profile?.industry || 'Unknown';
      const exchange = price.exchangeName || 'Unknown';

      const marketCap = price.marketCap || undefined;
      const currentPrice = price.regularMarketPrice || undefined;
      
      const pe = profile?.trailingPE || stats?.trailingPE || undefined;
      const pb = stats?.priceToBook || undefined;
      const eps = stats?.trailingEps || undefined;
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

      // Simple heuristic: if there's no data or the most recent data is more than a week old relative to period2, we fetch and merge.
      // For a robust system, we would query the exact missing segments, but fetching the whole range and using skipDuplicates is safer.
      const needsSync = existingData.length === 0 || 
        (existingData[existingData.length - 1].date.getTime() < p2Date.getTime() - 7 * 24 * 60 * 60 * 1000);

      if (needsSync) {
        const yahooData: any[] = await yahooFinance.historical(ticker, {
          period1,
          period2,
          interval: '1d',
        });

        if (yahooData && yahooData.length > 0) {
          // Insert into DB
          const recordsToInsert = yahooData.map((day: any) => ({
            stockId: stock.id,
            date: day.date,
            open: day.open,
            high: day.high,
            low: day.low,
            close: day.close,
            volume: day.volume,
          }));

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
