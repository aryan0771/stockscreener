const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

async function run() {
  const ticker = 'ABB.NS';
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 5);

  const chartDataResult = await yahooFinance.chart(ticker, {
    period1: startDate.toISOString().split('T')[0],
    interval: '1m',
  });

  const quotes = chartDataResult.quotes || [];
  console.log(`Total quotes fetched: ${quotes.length}`);
  if (quotes.length > 0) {
    console.log(`First quote:`, quotes[0].date);
    console.log(`Last quote:`, quotes[quotes.length - 1].date);
  }
}

run().catch(console.error);
