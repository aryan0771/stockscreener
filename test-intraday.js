const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

async function test() {
  const ticker = 'ABB.NS';
  const stock = await prisma.stock.findUnique({ where: { ticker } });
  if (!stock) return console.log('no stock');

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 5);

  const chartDataResult = await yahooFinance.chart(ticker, {
    period1: startDate.toISOString().split('T')[0],
    interval: '1m',
  });

  const yahooData = chartDataResult?.quotes || [];
  console.log(`Fetched ${yahooData.length} quotes from Yahoo`);

  const recordsToInsert = yahooData
    .filter((bar) => bar.open !== null && bar.open !== undefined && bar.close !== null && bar.close !== undefined)
    .map((bar) => ({
      stockId: stock.id,
      time: bar.date,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume || null,
    }));

  console.log(`Prepared ${recordsToInsert.length} records to insert.`);
  if (recordsToInsert.length > 0) {
     console.log('Sample record:', recordsToInsert[recordsToInsert.length - 1]);
  }

  try {
    const result = await prisma.intradayPrice.createMany({
      data: recordsToInsert,
      skipDuplicates: true,
    });
    console.log(`Insert result:`, result);
  } catch (err) {
    console.error(`Error inserting:`, err);
  }
}
test();
