"use server";

import { WatchlistService } from "@/services/watchlistService";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createWatchlistAction(name: string, description?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const watchlist = await WatchlistService.createWatchlist(session.user.id, name, description);
    revalidatePath("/watchlists");
    return { success: true, watchlist };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create watchlist" };
  }
}

export async function addStockToWatchlistAction(watchlistId: string, ticker: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const watchlistStock = await WatchlistService.addStockToWatchlist(session.user.id, watchlistId, ticker);
    revalidatePath("/watchlists");
    revalidatePath(`/stocks/${ticker}`);
    return { success: true, watchlistStock };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to add stock" };
  }
}

export async function removeStockFromWatchlistAction(watchlistId: string, stockId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    await WatchlistService.removeStockFromWatchlist(session.user.id, watchlistId, stockId);
    revalidatePath("/watchlists");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to remove stock" };
  }
}

export async function deleteWatchlistAction(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    await WatchlistService.deleteWatchlist(session.user.id, id);
    revalidatePath("/watchlists");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete watchlist" };
  }
}
