import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { StockSyncService } from "@/services/stockSyncService";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const upperTicker = ticker.toUpperCase();

  const searchParams = request.nextUrl.searchParams;
  const interval = searchParams.get('interval') || '1d';

  try {
    const stock = await prisma.stock.findUnique({ where: { ticker: upperTicker } });
    
    if (!stock) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 });
    }

    const isDailyOrAbove = ['1d', '1w', '1mo'].includes(interval);
    
    let rawData = [];
    
    if (isDailyOrAbove) {
      // Use HistoricalPrice for daily, weekly, monthly
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      
      rawData = await prisma.historicalPrice.findMany({
        where: {
          stockId: stock.id,
          date: { gte: twoYearsAgo },
        },
        orderBy: { date: 'asc' },
      });
      
      const lastDailyBar = rawData[rawData.length - 1];
      const needsDailySync = rawData.length === 0 || 
        (lastDailyBar && (Date.now() - lastDailyBar.date.getTime() > 12 * 60 * 60 * 1000));
      
      if (needsDailySync) {
        // Fetch and sync if missing or stale
        const fetchedData = await StockSyncService.getHistoricalData(upperTicker, twoYearsAgo.toISOString().split('T')[0]) as any;
        if (interval === '1d') {
          return NextResponse.json(fetchedData);
        } else {
           // We need raw DB records to aggregate 1w/1mo
           rawData = await prisma.historicalPrice.findMany({
             where: { stockId: stock.id, date: { gte: twoYearsAgo } },
             orderBy: { date: 'asc' },
           });
        }
      }
    } else {
      // Use IntradayPrice for 1m, 3m, 5m, 15m, 1h
      // For intraday, we fetch all available data (which we synced for last 5 days)
      rawData = await prisma.intradayPrice.findMany({
        where: { stockId: stock.id },
        orderBy: { time: 'asc' },
      });
      
      const lastBar = rawData[rawData.length - 1];
      const needsSync = rawData.length === 0 || 
        (lastBar && (Date.now() - lastBar.time.getTime() > 15 * 60 * 1000));

      if (needsSync) {
        // Try to sync on the fly if missing or older than 15 minutes
        await StockSyncService.syncIntradayData(upperTicker);
        rawData = await prisma.intradayPrice.findMany({
          where: { stockId: stock.id },
          orderBy: { time: 'asc' },
        });
      }
    }

    const aggregated = StockSyncService.aggregateChartData(rawData, interval);
    return NextResponse.json(aggregated);
    
  } catch (error: any) {
    console.error("Error fetching chart data:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message, stack: error.stack }, { status: 500 });
  }
}
