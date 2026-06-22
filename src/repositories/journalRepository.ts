import { prisma } from "@/lib/db";

export class JournalRepository {
  static async upsertJournal(stockId: string, userId: string, data: {
    buyThesis?: string;
    riskFactors?: string;
    exitCriteria?: string;
    convictionLevel?: string;
  }) {
    return prisma.investmentJournal.upsert({
      where: {
        stockId_userId: {
          stockId,
          userId,
        },
      },
      update: data,
      create: {
        stockId,
        userId,
        ...data,
      },
    });
  }

  static async getJournal(stockId: string, userId: string) {
    return prisma.investmentJournal.findUnique({
      where: {
        stockId_userId: {
          stockId,
          userId,
        },
      },
    });
  }
}
