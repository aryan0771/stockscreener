import { WatchlistRepository } from "@/repositories/watchlistRepository";
import { StockRepository } from "@/repositories/stockRepository";

export class WatchlistService {
  static async createWatchlist(userId: string, name: string, description?: string) {
    if (!name.trim()) throw new Error("Watchlist name is required");
    return WatchlistRepository.createWatchlist(userId, name, description);
  }

  static async getUserWatchlists(userId: string) {
    return WatchlistRepository.getUserWatchlists(userId);
  }

  static async addStockToWatchlist(userId: string, watchlistId: string, ticker: string) {
    // Verify stock exists, or sync it?
    // For simplicity, we just find it. If it doesn't exist, it should be synced first.
    const stock = await StockRepository.findByTicker(ticker);
    if (!stock) {
      throw new Error("Stock not found. Please view the stock page first to sync data.");
    }

    // Check watchlist ownership
    const watchlists = await this.getUserWatchlists(userId);
    const watchlist = watchlists.find((w) => w.id === watchlistId);
    if (!watchlist) throw new Error("Watchlist not found or unauthorized");

    // Check if already in watchlist
    const exists = watchlist.watchlistStocks.some((ws) => ws.stockId === stock.id);
    if (exists) throw new Error("Stock is already in this watchlist");

    return WatchlistRepository.addStockToWatchlist(watchlistId, stock.id);
  }

  static async removeStockFromWatchlist(userId: string, watchlistId: string, stockId: string) {
    const watchlists = await this.getUserWatchlists(userId);
    const watchlist = watchlists.find((w) => w.id === watchlistId);
    if (!watchlist) throw new Error("Watchlist not found or unauthorized");

    return WatchlistRepository.removeStockFromWatchlist(watchlistId, stockId);
  }

  static async deleteWatchlist(userId: string, id: string) {
    const watchlists = await this.getUserWatchlists(userId);
    const watchlist = watchlists.find((w) => w.id === id);
    if (!watchlist) throw new Error("Watchlist not found or unauthorized");

    return WatchlistRepository.deleteWatchlist(id);
  }
}
