import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { PerformanceService } from "@/services/portfolio/performance.service";

export async function GET() {
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

    const performance = await PerformanceService.getPerformance(userId);

    return NextResponse.json({ success: true, performance });
  } catch (error: any) {
    console.error("Failed to fetch performance:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
