import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { StockSyncService } from '@/services/stockSyncService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. Security check: Ensure the request comes from Vercel Cron
    // Set CRON_SECRET in your Vercel Environment Variables
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      if (process.env.NODE_ENV === 'production') {
        return new NextResponse('Unauthorized', { status: 401 });
      }
    }

    // 2. Fetch unique stock IDs from active positions
    const activePositions = await prisma.position.findMany({
      where: {
        quantity: {
          gt: 0
        }
      },
      select: {
        stockId: true
      },
      distinct: ['stockId']
    });

    const stockIds = activePositions.map(p => p.stockId);

    if (stockIds.length === 0) {
      // Still ping the DB to keep it warm even if no positions exist
      await prisma.$queryRaw`SELECT 1`;
      return NextResponse.json({ status: 'ok', message: 'No active positions. DB pinged.' });
    }

    // 3. Fetch tickers for those stock IDs
    const stocks = await prisma.stock.findMany({
      where: {
        id: { in: stockIds }
      },
      select: {
        ticker: true
      }
    });

    const tickers = stocks.map(s => s.ticker);

    // 4. Sync real-time quotes using the existing service
    // This will hit Yahoo Finance, update the DB with latest prices, and append to intraday
    if (tickers.length > 0) {
      await StockSyncService.syncRealtimeQuotes(tickers);
    }

    return NextResponse.json({ 
      status: 'ok', 
      syncedCount: tickers.length,
      tickers 
    });

  } catch (error: any) {
    console.error('Keepalive Cron Error:', error);
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
