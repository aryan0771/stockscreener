import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();
import { prisma } from '@/lib/db';
import https from 'https';

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
        
        // Sync intraday data as well
        await this.syncIntradayData(ticker);
        
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 500));

        results.push({ ticker, status: 'success', data: result });
      } catch (error: any) {
        results.push({ ticker, status: 'error', message: error.message });
      }
    }
    return results;
  }

  /**
   * Syncs intraday (1-minute) data for the last few days.
   */
  static async syncIntradayData(ticker: string) {
    try {
      const stock = await prisma.stock.findUnique({ where: { ticker } });
      if (!stock) return false;

      // Yahoo Finance allows 1m data for the last 7 days. We'll request 5 days.
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 5);

      const chartDataResult: any = await yahooFinance.chart(ticker, {
        period1: startDate.toISOString().split('T')[0],
        period2: endDate.toISOString().split('T')[0],
        interval: '1m',
      });

      const yahooData = chartDataResult?.quotes || [];

      if (yahooData && yahooData.length > 0) {
        const recordsToInsert = yahooData
          .filter((bar: any) => bar.open !== null && bar.open !== undefined && bar.close !== null && bar.close !== undefined)
          .map((bar: any) => ({
            stockId: stock.id,
            time: bar.date,
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
            volume: bar.volume || null,
          }));

        await prisma.intradayPrice.createMany({
          data: recordsToInsert,
          skipDuplicates: true,
        });

        console.log(`Synced ${recordsToInsert.length} intraday bars for ${ticker}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error syncing intraday data for ${ticker}:`, error);
      return false;
    }
  }

  /**
   * Helper to aggregate 1-minute or 1-day bars into larger intervals.
   */
  static aggregateChartData(data: any[], interval: string) {
    if (interval === '1m' || interval === '1d') {
      const isDailyFormat = interval === '1d';
      return data.map(b => {
        const dateObj = new Date(b.time || b.date);
        return {
          ...b,
          time: isDailyFormat ? dateObj.toISOString().split('T')[0] : Math.floor(dateObj.getTime() / 1000),
          value: b.volume || 0,
          color: b.close >= b.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
        };
      });
    }

    const intervalMsMap: Record<string, number> = {
      '3m': 3 * 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
      '1mo': 30 * 24 * 60 * 60 * 1000,
    };

    const periodMs = intervalMsMap[interval];
    if (!periodMs) return data;

    const aggregated = [];
    let currentBar: any = null;
    let currentPeriodStart = 0;

    for (const bar of data) {
      const timeMs = new Date(bar.time || bar.date).getTime();
      const periodStart = Math.floor(timeMs / periodMs) * periodMs;

      if (currentPeriodStart !== periodStart) {
        if (currentBar) {
          aggregated.push(currentBar);
        }
        currentPeriodStart = periodStart;
        currentBar = {
          time: new Date(periodStart),
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume || bar.value || 0,
        };
      } else {
        if (currentBar) {
          currentBar.high = Math.max(currentBar.high, bar.high);
          currentBar.low = Math.min(currentBar.low, bar.low);
          currentBar.close = bar.close;
          currentBar.volume += (bar.volume || bar.value || 0);
        }
      }
    }

    if (currentBar) {
      aggregated.push(currentBar);
    }

    return aggregated.map(b => {
      // Lightweight charts requires time format 'YYYY-MM-DD' for daily, or unix timestamp (seconds) for intraday.
      // We will provide Unix timestamp in seconds to be safe for intraday.
      const isDailyOrAbove = ['1w', '1mo'].includes(interval);
      return {
        ...b,
        time: isDailyOrAbove ? b.time.toISOString().split('T')[0] : Math.floor(b.time.getTime() / 1000),
        value: b.volume,
        color: b.close >= b.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
      };
    });
  }

  /**
   * Syncs the entire Nifty 100 list from the official NSE archives.
   */
  static async syncNifty100() {
    return new Promise((resolve, reject) => {
      https.get('https://archives.nseindia.com/content/indices/ind_nifty100list.csv', (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', async () => {
          try {
            const lines = data.split('\n');
            const tickers = [];
            // Skip header and loop through lines
            for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;
              const columns = line.split(',');
              if (columns.length > 2) {
                const symbol = columns[2].trim();
                if (symbol) {
                  tickers.push(`${symbol}.NS`);
                }
              }
            }
            
            console.log(`Starting bulk sync for ${tickers.length} Nifty 100 stocks...`);
            const results = await this.syncBatch(tickers);
            resolve(results);
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', (err) => {
        reject(err);
      });
    });
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
