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
