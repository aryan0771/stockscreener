const YahooFinance = require('yahoo-finance2').default;

async function test() {
  const period2 = new Date().toISOString().split('T')[0];
  const period1 = new Date();
  period1.setFullYear(period1.getFullYear() - 2);
  
  const data = await YahooFinance.historical('HDFCBANK.NS', {
    period1: period1.toISOString().split('T')[0],
    period2: period2,
    interval: '1d'
  });

  // Print last 5 days
  console.log("Last 5 days of Yahoo Data:");
  data.slice(-5).forEach(d => {
    console.log(`Date: ${d.date.toISOString().split('T')[0]}, Close: ${d.close}, AdjClose: ${d.adjClose}`);
  });

  // Calculate 200 SMA on raw close and adjClose
  if (data.length >= 200) {
    let sumClose = 0;
    let sumAdjClose = 0;
    for(let i=data.length - 200; i < data.length; i++) {
      sumClose += data[i].close;
      sumAdjClose += data[i].adjClose || data[i].close;
    }
    console.log(`\n200 SMA (Raw Close): ${sumClose / 200}`);
    console.log(`200 SMA (Adj Close): ${sumAdjClose / 200}`);
    console.log(`Current price (Last AdjClose): ${data[data.length-1].adjClose || data[data.length-1].close}`);
  }
}

test().catch(console.error);
