import { GoogleGenAI } from "@google/genai";
import { StockRepository } from "@/repositories/stockRepository";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export class AiService {
  static async generateStockSummary(ticker: string) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set. Please configure your environment variables.");
    }

    const stock = await StockRepository.findByTicker(ticker);
    if (!stock) throw new Error("Stock not found");

    const prompt = `
      You are an expert financial analyst. Please provide a concise analysis of ${stock.companyName} (${stock.ticker}) based on the following metrics:
      - Sector: ${stock.sector}
      - Industry: ${stock.industry}
      - Price: ₹${stock.currentPrice}
      - P/E Ratio: ${stock.pe}
      - P/B Ratio: ${stock.pb}
      - ROE: ${stock.roe ? (stock.roe * 100).toFixed(2) + '%' : 'N/A'}
      - Dividend Yield: ${stock.dividendYield ? (stock.dividendYield * 100).toFixed(2) + '%' : 'N/A'}
      
      Your analysis must specifically focus on swing trading. Evaluate the current metrics to determine if this stock is a good candidate for a swing trade over the next few weeks to months. 
      All currency values must be written in Indian Rupees (₹). DO NOT use the $ symbol under any circumstances.
      
      End your analysis with a bolded "**Final Verdict:**" stating clearly whether to "BUY", "HOLD", or "AVOID" for a swing trade, followed by a short one-sentence justification.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text;
    } catch (error) {
      console.error("AI Generation Error:", error);
      throw new Error("Failed to generate AI summary.");
    }
  }
}
