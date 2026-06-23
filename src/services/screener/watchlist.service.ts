import { prisma } from "@/lib/db";

export class WatchlistService {
  // Since we don't have an auth context in this demo script, we will just use the first user.
  // In production, `userId` would be passed from the session.
  
  static async getOrCreateDefaultWatchlist(userId: string) {
    let watchlist = await prisma.watchlist.findFirst({
      where: { userId, name: "SMA44 Opportunities" }
    });

    if (!watchlist) {
      watchlist = await prisma.watchlist.create({
        data: {
          userId,
          name: "SMA44 Opportunities",
          description: "Stocks caught by the SMA44 Pullback Screener"
        }
      });
    }

    return watchlist;
  }

  static async addStockToWatchlist(stockId: string, userId: string) {
    const watchlist = await this.getOrCreateDefaultWatchlist(userId);

    // Check if already in watchlist
    const existing = await prisma.watchlistStock.findUnique({
      where: {
        watchlistId_stockId: {
          watchlistId: watchlist.id,
          stockId
        }
      }
    });

    if (existing) return existing;

    return prisma.watchlistStock.create({
      data: {
        watchlistId: watchlist.id,
        stockId
      }
    });
  }
}
