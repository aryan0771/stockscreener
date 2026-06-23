import { NextRequest, NextResponse } from "next/server";
import { PortfolioService } from "@/services/portfolio/portfolio.service";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    let userId = "";
    if (session?.user?.email) {
      const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } });
      if (dbUser) userId = dbUser.id;
    }

    if (!userId) {
      const defaultUser = await prisma.user.findFirst();
      if (!defaultUser) {
        return NextResponse.json({ success: false, error: "No users exist" }, { status: 400 });
      }
      userId = defaultUser.id;
    }

    const { stockId, type, quantity, price, strategy } = await req.json();

    if (!stockId || !type || !quantity || !price) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const trade = await PortfolioService.executeTrade({
      userId,
      stockId,
      type,
      quantity: Number(quantity),
      price: Number(price),
      strategy: strategy || "Manual",
    });

    return NextResponse.json({ success: true, trade });
  } catch (error: any) {
    console.error("Trade execution failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
