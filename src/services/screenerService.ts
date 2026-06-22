import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { DecisionScoreEngine } from "./decisionScoreEngine";

export interface ScreenerFilters {
  minPe?: number;
  maxPe?: number;
  minRoe?: number; // expecting decimal (e.g., 0.15 for 15%)
  minMarginOfSafety?: number;
  sector?: string;
  minMarketCap?: number;
  // Advanced Dynamic Filters
  signal?: "Strong Buy" | "Watch Closely" | "BuyWatch" | "";
  trend?: "Uptrend" | "Downtrend" | "";
  healthyRsi?: boolean;
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

    let stocks = await prisma.stock.findMany({
      where,
      orderBy: { marketCap: "desc" },
      // Fetch up to 200 so we can filter in-memory accurately before slicing to 50
      take: 200, 
    });

    // In-memory dynamic filtering
    if (filters.signal || filters.trend || filters.healthyRsi) {
      stocks = stocks.filter((stock) => {
        let keep = true;

        if (filters.signal) {
          const { label } = DecisionScoreEngine.calculateScore(stock);
          if (filters.signal === "BuyWatch") {
            if (label !== "Strong Buy" && label !== "Watch Closely") keep = false;
          } else {
            if (label !== filters.signal) keep = false;
          }
        }

        if (filters.trend) {
          if (stock.currentPrice && stock.fiftyTwoWeekHigh) {
            const drop = ((stock.fiftyTwoWeekHigh - stock.currentPrice) / stock.fiftyTwoWeekHigh) * 100;
            if (filters.trend === "Uptrend" && drop > 15) keep = false;
            if (filters.trend === "Downtrend" && drop <= 30) keep = false;
          } else {
            keep = false; // Missing data means it doesn't match the trend filter
          }
        }

        if (filters.healthyRsi) {
          if (stock.rsi === null || stock.rsi === undefined || stock.rsi < 30 || stock.rsi > 60) {
            keep = false;
          }
        }

        return keep;
      });
    }

    // Limit final results to 50
    return stocks.slice(0, 50);
  }

  static async getUniqueSectors() {
    const sectors = await prisma.stock.findMany({
      select: { sector: true },
      distinct: ['sector'],
    });
    return sectors.map(s => s.sector).filter(Boolean);
  }
}
