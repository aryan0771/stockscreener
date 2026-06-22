import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export class WatchlistRepository {
  static async createWatchlist(userId: string, name: string, description?: string) {
    return prisma.watchlist.create({
      data: {
        userId,
        name,
        description,
      },
    });
  }

  static async getUserWatchlists(userId: string) {
    return prisma.watchlist.findMany({
      where: { userId },
      include: {
        watchlistStocks: {
          include: {
            stock: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async addStockToWatchlist(watchlistId: string, stockId: string) {
    return prisma.watchlistStock.create({
      data: {
        watchlistId,
        stockId,
      },
    });
  }

  static async removeStockFromWatchlist(watchlistId: string, stockId: string) {
    return prisma.watchlistStock.delete({
      where: {
        watchlistId_stockId: {
          watchlistId,
          stockId,
        },
      },
    });
  }

  static async deleteWatchlist(id: string) {
    return prisma.watchlist.delete({
      where: { id },
    });
  }
}
