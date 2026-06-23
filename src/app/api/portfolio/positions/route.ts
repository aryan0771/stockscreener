import { NextRequest, NextResponse } from "next/server";
import { PortfolioService } from "@/services/portfolio/portfolio.service";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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

    const holdings = await PortfolioService.getHoldings(userId);

    return NextResponse.json({ success: true, holdings });
  } catch (error: any) {
    console.error("Fetch holdings failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
