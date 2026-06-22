"use server";

import { ScreenerService, ScreenerFilters } from "@/services/screenerService";
import { StockSyncService } from "@/services/stockSyncService";

export async function screenStocksAction(filters: ScreenerFilters) {
  try {
    const stocks = await ScreenerService.screenStocks(filters);
    return { success: true, stocks };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to screen stocks" };
  }
}

export async function syncNifty100Action() {
  try {
    const results = await StockSyncService.syncNifty100();
    return { success: true, results };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to sync Nifty 100" };
  }
}
