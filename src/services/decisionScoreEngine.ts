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
   * Weights (Swing Trading Optimized):
   * Technicals = 40%
   * Valuation = 20%
   * Growth = 15%
   * Quality = 15%
   * Sentiment = 10%
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

    // 4. Technicals (RSI & Momentum)
    let calculatedTechScore = 50;
    
    // RSI Component (50% of Tech Score)
    let rsiScore = 50;
    if (stock.rsi !== null && stock.rsi !== undefined) {
      if (stock.rsi >= 30 && stock.rsi < 45) rsiScore = 90; // Oversold bounce
      else if (stock.rsi >= 45 && stock.rsi <= 60) rsiScore = 80; // Healthy uptrend
      else if (stock.rsi > 60 && stock.rsi <= 70) rsiScore = 60; // Strong momentum
      else if (stock.rsi < 30) rsiScore = 40; // Falling knife
      else if (stock.rsi > 70) rsiScore = 30; // Overbought
    }

    // Momentum Component (50% of Tech Score)
    let momentumScore = 50;
    if (stock.currentPrice && stock.fiftyTwoWeekHigh) {
      const dropFromHigh = ((stock.fiftyTwoWeekHigh - stock.currentPrice) / stock.fiftyTwoWeekHigh) * 100;
      if (dropFromHigh <= 5) momentumScore = 90; // Breakout zone
      else if (dropFromHigh <= 15) momentumScore = 75; // Solid uptrend
      else if (dropFromHigh <= 30) momentumScore = 50; // Consolidation
      else momentumScore = 20; // Downtrend
    }

    if (stock.rsi || stock.fiftyTwoWeekHigh) {
      calculatedTechScore = (rsiScore * 0.5) + (momentumScore * 0.5);
    }

    // Override default 50 with passed technicalScore or our new calculated one
    techScore = technicalScore ?? calculatedTechScore;

    // Calculate Final Score
    const finalScore = 
      (techScore * 0.40) +
      (valuationScore * 0.20) +
      (growthScore * 0.15) +
      (qualityScore * 0.15) +
      (sentScore * 0.10);

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
