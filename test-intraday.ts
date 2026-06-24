import { StockSyncService } from './src/services/stockSyncService';

async function test() {
  console.log('Syncing ABB.NS...');
  await StockSyncService.syncIntradayData('ABB.NS');
  console.log('Done syncing. Fetching DB...');
  const { prisma } = require('./src/lib/db');
  
  const stock = await prisma.stock.findUnique({ where: { ticker: 'ABB.NS' } });
  const data = await prisma.intradayPrice.findMany({
    where: { stockId: stock.id },
    orderBy: { time: 'desc' },
    take: 5
  });
  console.log('Last 5 records:', data);
}

test().catch(console.error);
