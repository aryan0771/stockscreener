import { prisma } from "@/lib/db";
import { StockSyncService } from "@/services/stockSyncService";

export class PortfolioService {
  /**
   * Ensure user has a wallet, otherwise create one with 10 Lakhs
   */
  static async initializeWallet(userId: string) {
    let wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId,
          balance: 1000000,
        },
      });

      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: 1000000,
          description: "Initial Dummy Portfolio Funding",
          type: "DEPOSIT",
        },
      });
    }

    return wallet;
  }

  /**
   * Execute a paper trade
   */
  static async executeTrade(params: {
    userId: string;
    stockId: string;
    type: "BUY" | "SELL";
    quantity: number;
    price: number;
    strategy: string;
  }) {
    const { userId, stockId, type, quantity, price, strategy } = params;
    const totalCost = quantity * price;

    return prisma.$transaction(async (tx) => {
      // 1. Get Wallet
      let wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        wallet = await tx.wallet.create({ data: { userId, balance: 1000000 } });
        await tx.walletTransaction.create({
          data: { walletId: wallet.id, amount: 1000000, description: "Initial Dummy Portfolio Funding", type: "DEPOSIT" },
        });
      }

      // 2. Get Position
      const position = await tx.position.findUnique({
        where: {
          userId_stockId_strategy: { userId, stockId, strategy },
        },
      });

      if (type === "BUY") {
        if (wallet.balance < totalCost) {
          throw new Error("Insufficient funds in wallet");
        }

        // Deduct balance
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { decrement: totalCost } },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: -totalCost,
            description: `Bought ${quantity} shares at ₹${price}`,
            type: "BUY",
          },
        });

        // Update/Create position
        if (position) {
          const newQuantity = position.quantity + quantity;
          const newAverage = ((position.averagePrice * position.quantity) + totalCost) / newQuantity;
          await tx.position.update({
            where: { id: position.id },
            data: { quantity: newQuantity, averagePrice: newAverage },
          });
        } else {
          await tx.position.create({
            data: { userId, stockId, quantity, averagePrice: price, strategy },
          });
        }
      } else {
        // SELL
        if (!position || position.quantity < quantity) {
          throw new Error("Insufficient shares to sell");
        }

        // Add balance
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: totalCost } },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: totalCost,
            description: `Sold ${quantity} shares at ₹${price}`,
            type: "SELL",
          },
        });

        // Update/Delete position
        if (position.quantity === quantity) {
          await tx.position.delete({ where: { id: position.id } });
        } else {
          await tx.position.update({
            where: { id: position.id },
            data: { quantity: { decrement: quantity } },
          });
        }
      }

      // Record Trade
      return tx.trade.create({
        data: { userId, stockId, type, quantity, price, strategy },
      });
    });
  }

  /**
   * Fetch active holdings and calculate current value and P&L
   */
  static async getHoldings(userId: string) {
    const positions = await prisma.position.findMany({
      where: { userId },
      include: { stock: true },
    });

    // We can fetch live prices using StockSyncService if needed, 
    // but stock.currentPrice in DB should be reasonably fresh
    const holdings = positions.map((p) => {
      const livePrice = p.stock.currentPrice || p.averagePrice;
      const currentValue = livePrice * p.quantity;
      const investedValue = p.averagePrice * p.quantity;
      const pnl = currentValue - investedValue;
      const pnlPercent = (pnl / investedValue) * 100;

      return {
        ...p,
        currentPrice: livePrice,
        currentValue,
        investedValue,
        pnl,
        pnlPercent,
      };
    });

    return holdings;
  }

  /**
   * Get wallet summary
   */
  static async getSummary(userId: string) {
    const wallet = await this.initializeWallet(userId);
    const holdings = await this.getHoldings(userId);

    const totalInvested = holdings.reduce((sum, h) => sum + h.investedValue, 0);
    const totalCurrentValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const unrealizedPnl = totalCurrentValue - totalInvested;
    const portfolioValue = wallet.balance + totalCurrentValue;

    return {
      balance: wallet.balance,
      totalInvested,
      totalCurrentValue,
      unrealizedPnl,
      portfolioValue,
    };
  }

  /**
   * Get trade history
   */
  static async getTradeBook(userId: string) {
    return prisma.trade.findMany({
      where: { userId },
      include: { stock: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get wallet ledger
   */
  static async getLedger(userId: string) {
    const wallet = await this.initializeWallet(userId);
    return prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
    });
  }
}
