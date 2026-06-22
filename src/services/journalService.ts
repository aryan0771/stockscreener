import { JournalRepository } from "@/repositories/journalRepository";
import { StockRepository } from "@/repositories/stockRepository";

export class JournalService {
  static async upsertJournal(stockTicker: string, userId: string, data: {
    buyThesis?: string;
    riskFactors?: string;
    exitCriteria?: string;
    convictionLevel?: string;
  }) {
    const stock = await StockRepository.findByTicker(stockTicker);
    if (!stock) throw new Error("Stock not found");

    return JournalRepository.upsertJournal(stock.id, userId, data);
  }

  static async getJournal(stockTicker: string, userId: string) {
    const stock = await StockRepository.findByTicker(stockTicker);
    if (!stock) throw new Error("Stock not found");

    return JournalRepository.getJournal(stock.id, userId);
  }
}
