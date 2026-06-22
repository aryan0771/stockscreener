import { Prisma } from "@prisma/client";

type StockData = Prisma.StockGetPayload<{}>;

export interface ScoreResult {
  score: number;
  label: "Strong Buy" | "Watch Closely" | "Neutral" | "Avoid";
  color: string;
  breakdown: {
    valuation: number;
    growth: number;
    quality: number;
    technicals: number;
    sentiment: number;
  };
}

export class DecisionScoreEngine {
  /**
   * Weights:
   * Valuation = 25%
   * Growth = 25%
   * Quality = 20%
   * Technicals = 15%
   * Sentiment = 15%
   */
  static calculateScore(stock: StockData, technicalScore?: number, sentimentScore?: number): ScoreResult {
    let valuationScore = 50; // out of 100
    let growthScore = 50;
    let qualityScore = 50;
    let techScore = technicalScore ?? 50; // default neutral if no data
    let sentScore = sentimentScore ?? 50; // default neutral if no data

    // 1. Valuation (PE, PB, Margin of Safety)
    if (stock.marginOfSafety) {
      if (stock.marginOfSafety > 30) valuationScore = 90;
      else if (stock.marginOfSafety > 15) valuationScore = 75;
      else if (stock.marginOfSafety > 0) valuationScore = 60;
      else if (stock.marginOfSafety > -15) valuationScore = 40;
      else valuationScore = 20;
    } else if (stock.pe) {
      if (stock.pe < 15) valuationScore = 80;
      else if (stock.pe < 25) valuationScore = 60;
      else if (stock.pe < 40) valuationScore = 40;
      else valuationScore = 20;
    }

    // 2. Growth (Revenue & Profit Growth)
    if (stock.profitGrowth !== null && stock.profitGrowth !== undefined) {
      const g = stock.profitGrowth * 100; // convert to percentage
      if (g > 20) growthScore = 90;
      else if (g > 10) growthScore = 75;
      else if (g > 0) growthScore = 50;
      else if (g > -10) growthScore = 30;
      else growthScore = 10;
    }

    // 3. Quality (ROE, ROCE, Debt to Equity)
    if (stock.roe !== null && stock.roe !== undefined) {
      const roe = stock.roe * 100;
      if (roe > 20) qualityScore = 90;
      else if (roe > 15) qualityScore = 75;
      else if (roe > 10) qualityScore = 60;
      else if (roe > 5) qualityScore = 40;
      else qualityScore = 20;
    }
    
    // Penalize high debt
    if (stock.debtToEquity && stock.debtToEquity > 1) {
      qualityScore = Math.max(10, qualityScore - 20);
    }

    // Calculate Final Score
    const finalScore = 
      (valuationScore * 0.25) +
      (growthScore * 0.25) +
      (qualityScore * 0.20) +
      (techScore * 0.15) +
      (sentScore * 0.15);

    const score = Math.round(finalScore);

    let label: ScoreResult["label"] = "Neutral";
    let color = "text-gray-500";

    if (score >= 80) {
      label = "Strong Buy";
      color = "text-emerald-500 dark:text-emerald-400";
    } else if (score >= 60) {
      label = "Watch Closely";
      color = "text-blue-500 dark:text-blue-400";
    } else if (score >= 40) {
      label = "Neutral";
      color = "text-yellow-500 dark:text-yellow-400";
    } else {
      label = "Avoid";
      color = "text-red-500 dark:text-red-400";
    }

    return {
      score,
      label,
      color,
      breakdown: {
        valuation: valuationScore,
        growth: growthScore,
        quality: qualityScore,
        technicals: techScore,
        sentiment: sentScore
      }
    };
  }
}
