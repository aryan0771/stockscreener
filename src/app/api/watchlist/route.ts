import { NextRequest, NextResponse } from "next/server";
import { WatchlistService } from "@/services/screener/watchlist.service";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    // Default to the first user if no session for the sake of local testing
    let userId = "";
    if (session?.user?.email) {
      const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } });
      if (dbUser) userId = dbUser.id;
    }

    if (!userId) {
      const defaultUser = await prisma.user.findFirst();
      if (!defaultUser) {
        return NextResponse.json({ success: false, error: "No users exist in DB" }, { status: 400 });
      }
      userId = defaultUser.id;
    }

    const { stockId } = await req.json();

    if (!stockId) {
      return NextResponse.json({ success: false, error: "Missing stockId" }, { status: 400 });
    }

    await WatchlistService.addStockToWatchlist(stockId, userId);

    return NextResponse.json({ success: true, message: "Added to watchlist" });
  } catch (error: any) {
    console.error("Watchlist POST failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
