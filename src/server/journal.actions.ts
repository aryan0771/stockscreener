"use server";

import { JournalService } from "@/services/journalService";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function upsertJournalAction(ticker: string, data: {
  buyThesis?: string;
  riskFactors?: string;
  exitCriteria?: string;
  convictionLevel?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const journal = await JournalService.upsertJournal(ticker, session.user.id, data);
    revalidatePath(`/stocks/${ticker}`);
    return { success: true, journal };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update journal" };
  }
}
