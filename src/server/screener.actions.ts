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
    const results: any = await StockSyncService.syncNifty100();
    return { success: true, count: Array.isArray(results) ? results.length : 0 };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to sync Nifty 100" };
  }
}

export async function syncNifty500Action() {
  try {
    const results: any = await StockSyncService.syncNifty500();
    return { success: true, count: Array.isArray(results) ? results.length : 0 };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to sync Nifty 500" };
  }
}

export async function syncPennyStocksAction() {
  try {
    const results: any = await StockSyncService.syncPennyStocks();
    return { success: true, count: Array.isArray(results) ? results.length : 0 };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to sync Penny Stocks" };
  }
}
