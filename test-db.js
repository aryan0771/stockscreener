const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const stock = await prisma.stock.findUnique({ where: { ticker: 'ABB.NS' } });
  if (!stock) return console.log('no stock');

  const data = await prisma.intradayPrice.findMany({
    where: { stockId: stock.id },
    orderBy: { time: 'desc' },
    take: 5
  });
  console.log(data);
}
test();
