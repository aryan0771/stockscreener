"use server";

import { StockService } from "@/services/stockService";
import { Prisma } from "@prisma/client";

export async function getStocksAction(page: number = 1, limit: number = 20, where?: Prisma.StockWhereInput) {
  try {
    const data = await StockService.getStocks(page, limit, where);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch stocks" };
  }
}

export async function getStockByTickerAction(ticker: string) {
  try {
    const data = await StockService.getStockByTicker(ticker);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch stock" };
  }
}

export type ExploreFilters = {
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  page?: number;
  limit?: number;
};

export async function getExploreStocksAction(filters: ExploreFilters) {
  try {
    const { search, minPrice, maxPrice, sortBy, page = 1, limit = 24 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.StockWhereInput = {};
    if (search) {
      where.OR = [
        { ticker: { contains: search, mode: "insensitive" } },
        { companyName: { contains: search, mode: "insensitive" } },
      ];
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.currentPrice = {};
      if (minPrice !== undefined) where.currentPrice.gte = minPrice;
      if (maxPrice !== undefined) where.currentPrice.lte = maxPrice;
    }

    let orderBy: Prisma.StockOrderByWithRelationInput = { ticker: "asc" };
    if (sortBy === "price_asc") orderBy = { currentPrice: "asc" };
    else if (sortBy === "price_desc") orderBy = { currentPrice: "desc" };
    else if (sortBy === "rsi_asc") orderBy = { rsi: "asc" };
    else if (sortBy === "rsi_desc") orderBy = { rsi: "desc" };
    else if (sortBy === "name_asc") orderBy = { companyName: "asc" };
    else if (sortBy === "name_desc") orderBy = { companyName: "desc" };

    const result = await StockService.getStocks(page, limit, where, orderBy);
    
    // Dynamically calculate score for explore cards
    const { DecisionScoreEngine } = require("@/services/decisionScoreEngine");
    const enhancedStocks = result.stocks.map(stock => {
      const scoreObj = DecisionScoreEngine.calculateScore(stock as any);
      return { ...stock, decisionScore: scoreObj.score, decisionLabel: scoreObj.label, decisionColor: scoreObj.color };
    });

    return { success: true, data: { ...result, stocks: enhancedStocks } };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch explore stocks" };
  }
}
