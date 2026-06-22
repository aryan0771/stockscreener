"use server";

import { AiService } from "@/services/aiService";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function generateStockSummaryAction(ticker: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const summary = await AiService.generateStockSummary(ticker);
    return { success: true, summary };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to generate AI summary" };
  }
}
