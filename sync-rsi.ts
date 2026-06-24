import { prisma } from './src/lib/db';
import { StockSyncService } from './src/services/stockSyncService';

async function syncAll() {
  const stocks = await prisma.stock.findMany();
  console.log(`Found ${stocks.length} stocks. Checking history and RSI...`);

  let updated = 0;
  for (const stock of stocks) {
    let recentHistory = await prisma.historicalPrice.findMany({
      where: { stockId: stock.id },
      orderBy: { date: 'desc' },
      take: 15,
    });

    if (recentHistory.length < 15) {
      console.log(`Missing history for ${stock.ticker}, fetching...`);
      try {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        await StockSyncService.getHistoricalData(stock.ticker, oneYearAgo.toISOString().split('T')[0]);
        recentHistory = await prisma.historicalPrice.findMany({
          where: { stockId: stock.id },
          orderBy: { date: 'desc' },
          take: 15,
        });
      } catch (err: any) {
        console.error(`Failed to fetch history for ${stock.ticker}`, err.message);
        continue;
      }
    }

    if (recentHistory.length >= 15) {
      let gains = 0;
      let losses = 0;
      const chronoHistory = recentHistory.reverse();
      for (let i = 1; i < chronoHistory.length; i++) {
        const change = chronoHistory[i].close - chronoHistory[i - 1].close;
        if (change > 0) gains += change;
        else losses += Math.abs(change);
      }
      const avgGain = gains / 14;
      const avgLoss = losses / 14;
      let rsi = 100;
      if (avgLoss !== 0) {
        const rs = avgGain / avgLoss;
        rsi = 100 - (100 / (1 + rs));
      }

      await prisma.stock.update({
        where: { id: stock.id },
        data: { rsi }
      });
      updated++;
    }
  }
  console.log(`Updated RSI for ${updated}/${stocks.length} stocks.`);
}

syncAll().catch(console.error).finally(() => process.exit(0));
