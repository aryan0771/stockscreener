import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export class StockRepository {
  static async findAll(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.StockWhereInput;
    orderBy?: Prisma.StockOrderByWithRelationInput;
  }) {
    const { skip, take, where, orderBy } = params || {};
    return prisma.stock.findMany({
      skip,
      take,
      where,
      orderBy,
    });
  }

  static async findByTicker(ticker: string) {
    return prisma.stock.findUnique({
      where: { ticker },
    });
  }

  static async count(where?: Prisma.StockWhereInput) {
    return prisma.stock.count({ where });
  }
}
