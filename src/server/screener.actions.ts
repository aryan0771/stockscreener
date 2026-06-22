"use server";

import { ScreenerService, ScreenerFilters } from "@/services/screenerService";

export async function screenStocksAction(filters: ScreenerFilters) {
  try {
    const stocks = await ScreenerService.screenStocks(filters);
    return { success: true, stocks };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to screen stocks" };
  }
}
