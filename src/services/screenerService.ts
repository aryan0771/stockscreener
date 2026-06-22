import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export interface ScreenerFilters {
  minPe?: number;
  maxPe?: number;
  minRoe?: number; // expecting decimal (e.g., 0.15 for 15%)
  minMarginOfSafety?: number;
  sector?: string;
  minMarketCap?: number;
}

export class ScreenerService {
  static async screenStocks(filters: ScreenerFilters) {
    const where: Prisma.StockWhereInput = {};

    if (filters.minPe !== undefined) {
      where.pe = { ...((where.pe as object) || {}), gte: filters.minPe };
    }
    if (filters.maxPe !== undefined) {
      where.pe = { ...((where.pe as object) || {}), lte: filters.maxPe };
    }
    if (filters.minRoe !== undefined) {
      where.roe = { gte: filters.minRoe };
    }
    if (filters.minMarginOfSafety !== undefined) {
      where.marginOfSafety = { gte: filters.minMarginOfSafety };
    }
    if (filters.sector && filters.sector !== "All") {
      where.sector = filters.sector;
    }
    if (filters.minMarketCap !== undefined) {
      where.marketCap = { gte: filters.minMarketCap };
    }

    return prisma.stock.findMany({
      where,
      orderBy: { marketCap: "desc" },
      take: 50, // limit to 50 for performance
    });
  }

  static async getUniqueSectors() {
    const sectors = await prisma.stock.findMany({
      select: { sector: true },
      distinct: ['sector'],
    });
    return sectors.map(s => s.sector).filter(Boolean);
  }
}
