import { StockRepository } from "@/repositories/stockRepository";
import { Prisma } from "@prisma/client";

export class StockService {
  static async getStocks(page: number = 1, limit: number = 20, where?: Prisma.StockWhereInput, orderBy?: Prisma.StockOrderByWithRelationInput) {
    const skip = (page - 1) * limit;
    const [stocks, total] = await Promise.all([
      StockRepository.findAll({ skip, take: limit, where, orderBy }),
      StockRepository.count(where),
    ]);

    return {
      stocks,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getStockByTicker(ticker: string) {
    const stock = await StockRepository.findByTicker(ticker);
    if (!stock) {
      throw new Error("Stock not found");
    }
    return stock;
  }
}
