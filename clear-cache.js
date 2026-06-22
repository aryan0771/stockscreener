const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.historicalPrice.deleteMany({});
  console.log('Cleared all historical prices to force resync with split-adjusted data.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
