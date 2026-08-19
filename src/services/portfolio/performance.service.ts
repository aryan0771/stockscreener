import { prisma } from "@/lib/db";

export class PerformanceService {
  /**
   * Aggregate trades and positions to calculate strategy performance
   */
  static async getPerformance(userId: string) {
    // 1. Fetch all trades to reconstruct realized PnL
    const trades = await prisma.trade.findMany({
      where: { userId },
      include: { stock: true },
      orderBy: { createdAt: "asc" },
    });

    // Strategy map
    const strategyData: Record<string, {
      name: string;
      realizedPnl: number;
      totalInvested: number;
      firstTradeDate: Date | null;
      stockStats: Record<string, {
        symbol: string;
        companyName: string;
        realizedPnl: number;
        unrealizedPnl: number;
        quantity: number;
        amountInvested: number;
        scoreWhenBought: number | null;
        currentPrice: number;
        status: "Active" | "Closed";
        avgBuyPrice: number;
      }>;
    }> = {};

    // Grouping by strategy
    for (const trade of trades) {
      if (!strategyData[trade.strategy]) {
        strategyData[trade.strategy] = {
          name: trade.strategy,
          realizedPnl: 0,
          totalInvested: 0,
          firstTradeDate: trade.createdAt,
          stockStats: {},
        };
      }

      const st = strategyData[trade.strategy];
      if (!st.stockStats[trade.stockId]) {
        st.stockStats[trade.stockId] = {
          symbol: trade.stock.ticker,
          companyName: trade.stock.companyName,
          realizedPnl: 0,
          unrealizedPnl: 0,
          quantity: 0,
          amountInvested: 0,
          scoreWhenBought: trade.scoreWhenBought || null,
          currentPrice: trade.stock.currentPrice || trade.price,
          status: "Closed",
          avgBuyPrice: 0,
        };
      }

      const stockData = st.stockStats[trade.stockId];

      if (trade.type === "BUY") {
        const totalValue = (stockData.quantity * stockData.avgBuyPrice) + (trade.quantity * trade.price);
        stockData.quantity += trade.quantity;
        stockData.avgBuyPrice = totalValue / stockData.quantity;
        stockData.scoreWhenBought = trade.scoreWhenBought || stockData.scoreWhenBought; // update score if provided
      } else if (trade.type === "SELL") {
        if (stockData.quantity >= trade.quantity) {
          const profit = (trade.price - stockData.avgBuyPrice) * trade.quantity;
          stockData.realizedPnl += profit;
          st.realizedPnl += profit;
          stockData.quantity -= trade.quantity;
        } else {
          // Fallback if data is weird
          const profit = (trade.price - stockData.avgBuyPrice) * stockData.quantity;
          stockData.realizedPnl += profit;
          st.realizedPnl += profit;
          stockData.quantity = 0;
        }
      }
    }

    // Now compute active unrealized PnL and total invested
    const strategies = Object.values(strategyData).map(st => {
      let activeInvested = 0;
      let activeUnrealized = 0;
      let worstStock = { symbol: "-", pnl: Infinity };

      const stocksList = Object.values(st.stockStats).map(stock => {
        if (stock.quantity > 0) {
          stock.status = "Active";
          stock.amountInvested = stock.quantity * stock.avgBuyPrice;
          stock.unrealizedPnl = (stock.currentPrice - stock.avgBuyPrice) * stock.quantity;
          activeInvested += stock.amountInvested;
          activeUnrealized += stock.unrealizedPnl;
        } else {
          stock.status = "Closed";
          stock.amountInvested = 0;
          stock.unrealizedPnl = 0;
        }

        const totalStockPnl = stock.realizedPnl + stock.unrealizedPnl;
        if (totalStockPnl < worstStock.pnl) {
          worstStock = { symbol: stock.symbol, pnl: totalStockPnl };
        }

        return stock;
      });

      st.totalInvested = activeInvested;
      const totalPnl = st.realizedPnl + activeUnrealized;
      
      // Time-based calculations
      let daysActive = 1;
      if (st.firstTradeDate) {
        daysActive = Math.max(1, Math.floor((new Date().getTime() - st.firstTradeDate.getTime()) / (1000 * 3600 * 24)));
      }

      // Avoid divide by zero or extreme outliers if invested is 0 but we have PnL
      const returnPercent = activeInvested > 0 ? (totalPnl / activeInvested) : 0;
      
      // Simple annualized estimation
      const estimatedAnnualReturn = activeInvested > 0 ? returnPercent * (365 / daysActive) : 0;
      const estimatedMonthlyReturn = activeInvested > 0 ? returnPercent * (30 / daysActive) : 0;

      return {
        name: st.name,
        realizedPnl: st.realizedPnl,
        unrealizedPnl: activeUnrealized,
        totalPnl,
        totalInvested: activeInvested,
        returnPercent: returnPercent * 100, // as percentage
        estimatedAnnualReturn: estimatedAnnualReturn * 100,
        estimatedMonthlyReturn: estimatedMonthlyReturn * 100,
        worstStockSymbol: worstStock.pnl === Infinity ? "-" : worstStock.symbol,
        worstStockPnl: worstStock.pnl === Infinity ? 0 : worstStock.pnl,
        stocks: stocksList,
        daysActive,
      };
    });

    // Calculate Overall Performance
    const overall = {
      totalInvested: strategies.reduce((sum, s) => sum + s.totalInvested, 0),
      totalRealizedPnl: strategies.reduce((sum, s) => sum + s.realizedPnl, 0),
      totalUnrealizedPnl: strategies.reduce((sum, s) => sum + s.unrealizedPnl, 0),
      totalPnl: 0,
      bestStrategy: "-",
      worstStrategy: "-",
    };

    overall.totalPnl = overall.totalRealizedPnl + overall.totalUnrealizedPnl;

    if (strategies.length > 0) {
      let best = strategies[0];
      let worst = strategies[0];
      for (const st of strategies) {
        if (st.totalPnl > best.totalPnl) best = st;
        if (st.totalPnl < worst.totalPnl) worst = st;
      }
      overall.bestStrategy = best.name;
      overall.worstStrategy = worst.name;
    }

    return { overall, strategies };
  }
}
